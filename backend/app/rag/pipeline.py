import logging
from functools import lru_cache
from typing import Any, List, Tuple, Optional, cast
from langchain_core.embeddings import Embeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from chromadb.config import Settings as ChromaSettings
from ..config import settings

logger = logging.getLogger(__name__)

# OpenRouter (Embeddings)
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
# Groq (LLM)
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# ─── Embeddings OpenRouter (client custom, plus simple que langchain) ─
class OpenRouterEmbeddings(Embeddings):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def _call(self, texts: list[str]) -> list[list[float]]:
        import httpx
        r = httpx.post(
            f"{OPENROUTER_BASE_URL}/embeddings",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={"model": self.model, "input": texts},
            timeout=60.0,
        )
        r.raise_for_status()
        data = r.json().get("data") or []
        if not data:
            raise ValueError(f"Aucun embedding reçu d'OpenRouter : {r.text[:300]}")
        return [item["embedding"] for item in data]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._call(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._call([text])[0]

# ─── Embeddings (vecteurs de texte) ──────────────────────────────
@lru_cache(maxsize=1)
def _get_embeddings():
    # Embeddings via l'API OpenRouter.
    if not settings.OPENROUTER_API_KEY:
        raise RuntimeError(
            "OPENROUTER_API_KEY manquant : configure-le dans .env pour utiliser les embeddings."
        )
    return OpenRouterEmbeddings(
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.EMBEDDING_MODEL,
    )

# ─── LLM (Chat) ─────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def _get_llm():
    # Groq : API compatible OpenAI, utilisée uniquement pour le chat.
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY manquant : configure-le dans .env pour utiliser le LLM."
        )
    from langchain_openai import ChatOpenAI
    return cast(Any, ChatOpenAI)(
        model=settings.LLM_MODEL,
        api_key=settings.GROQ_API_KEY,
        base_url=GROQ_BASE_URL,
        temperature=0.1,
        max_tokens=settings.LLM_MAX_TOKENS,
    )

# ─── Base vectorielle ────────────────────────────────────────────
@lru_cache(maxsize=1)
def _get_vectorstore():
    return Chroma(
        persist_directory=settings.CHROMA_PATH,
        embedding_function=_get_embeddings(),
        collection_name="medassist_docs",
        client_settings=ChromaSettings(anonymized_telemetry=False, is_persistent=True),
    )

def _persist_vectorstore(vectorstore: Chroma) -> None:
    persist = getattr(vectorstore, "persist", None)
    if callable(persist):
        persist()

def supprimer_document_index(nom_document: str) -> None:
    vectorstore = _get_vectorstore()
    cast(Any, vectorstore._collection).delete(where={"source_document": nom_document})
    _persist_vectorstore(vectorstore)

def _purge_null_chunks(vectorstore) -> int:
    try:
        result = vectorstore._collection.get(include=["documents"])
    except Exception as exc:
        logger.warning("Impossible d'inspecter Chroma pour purger les null: %s", exc)
        return 0
    ids = result.get("ids") or []
    docs = result.get("documents") or []
    bad = [
        id_
        for id_, doc in zip(ids, docs)
        if doc is None or not isinstance(doc, str) or not doc.strip()
    ]
    if not bad:
        return 0
    logger.warning("Purge de %d chunk(s) Chroma vides/None: %s", len(bad), bad[:10])
    vectorstore._collection.delete(ids=bad)
    _persist_vectorstore(vectorstore)
    return len(bad)

# ─── Indexation d'un PDF ─────────────────────────────────────────
def indexer_pdf(chemin_pdf: str, nom_document: str) -> int:
    import os
    if not os.path.exists(chemin_pdf):
        raise ValueError(f"Fichier introuvable sur disque : {chemin_pdf}")

    loader = PyPDFLoader(chemin_pdf)
    pages = loader.load()
    if not pages:
        raise ValueError(
            "Le PDF ne contient aucune page lisible. "
            "S'il s'agit d'un scan, faites-le passer par un OCR avant de le téléverser."
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    chunks = splitter.split_documents(pages)
    if not chunks:
        raise ValueError(
            "Le PDF a été chargé mais n'a produit aucun chunk — "
            "probablement un scan sans texte extractible. Utilisez un PDF avec texte sélectionnable."
        )

    for chunk in chunks:
        chunk.metadata["source_document"] = nom_document

    vectorstore = _get_vectorstore()
    cast(Any, vectorstore._collection).delete(where={"source_document": nom_document})
    vectorstore.add_documents(chunks)
    _persist_vectorstore(vectorstore)

    actual = len(
        vectorstore._collection.get(
            where={"source_document": nom_document}, include=[]
        )["ids"]
    )
    if actual == 0:
        raise ValueError(
            "L'indexation a échoué silencieusement : "
            "aucun chunk trouvé dans Chroma après insertion."
        )
    return actual

# ─── Réponse RAG ─────────────────────────────────────────────────
SYSTEM_PROMPT = """Tu es MedAssist AI, un assistant pour le personnel hospitalier du CHU Mohammed VI d'Oujda.
Réponds UNIQUEMENT en te basant sur les documents fournis ci-dessous.
Si l'information n'est pas dans les documents, dis clairement :
"Cette information ne figure pas dans les documents disponibles."

Règles :
- Réponds toujours en français
- Sois précis et concis
- Cite le document source à la fin de ta réponse
- N'invente jamais d'information médicale ou technique

Documents disponibles :
{context}
"""

def repondre(question: str, historique: Optional[List[dict]] = None) -> Tuple[str, List[dict]]:
    vectorstore = _get_vectorstore()
    llm = _get_llm()

    _purge_null_chunks(vectorstore)

    try:
        resultats = vectorstore.similarity_search_with_score(
            question, k=settings.RAG_RETRIEVAL_K,
        )
    except Exception as exc:
        logger.warning(
            "RAG search a échoué (retombe sur message vide): %s: %s",
            type(exc).__name__, exc,
        )
        return (
            "Aucun document n'a encore été indexé. "
            "Veuillez téléverser des documents PDF depuis la section Documents.",
            []
        )

    if not resultats:
        return (
            "Aucun document n'a encore été indexé. "
            "Veuillez téléverser des documents PDF depuis la section Documents.",
            []
        )

    context_parts: list[str] = []
    sources: list[dict[str, object]] = []
    for doc, score in resultats:
        content = getattr(doc, "page_content", None)
        if not content or not isinstance(content, str) or not content.strip():
            continue

        source_document = doc.metadata.get("source_document", "Inconnu")
        page = doc.metadata.get("page", "?")
        context_parts.append(
            f"Source: {source_document}, page {page}\n{content}"
        )
        src: dict[str, object] = {
            "document": source_document,
            "page": page,
            "score": round(float(score), 3)
        }
        if src not in sources:
            sources.append(src)

    if not context_parts:
        return ("Je n'ai pas trouvé d'information pertinente dans les documents disponibles.", [])

    context = "\n\n---\n\n".join(context_parts)
    prompt = SYSTEM_PROMPT.format(context=context)

    from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
    messages: list[BaseMessage] = [SystemMessage(content=prompt)]

    if historique:
        for msg in historique[-6:]:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=question))

    reponse = llm.invoke(messages)
    return (str(reponse.content), sources)

# ─── Interprétation d'une mesure capteur ─────────────────────────
def interpreter_mesure(type_capteur: str, valeur: float, unite: str, emplacement: str) -> str:
    llm = _get_llm()

    try:
        vectorstore = _get_vectorstore()
        docs = vectorstore.similarity_search(
            f"valeurs recommandées {type_capteur} {emplacement}", k=2
        )
        context = "\n".join([d.page_content for d in docs]) if docs else ""
    except Exception:
        context = ""

    from langchain_core.messages import HumanMessage
    prompt = f"""Tu es un assistant hospitalier expert.
{f'Protocole de référence : {context}' if context else ''}

Mesure relevée :
- Type de mesure : {type_capteur}
- Valeur : {valeur} {unite}
- Emplacement : {emplacement or 'Non spécifié'}

En 2 à 3 phrases, indique si cette valeur est dans les normes, et si une action est nécessaire.
Réponds en français, de manière claire et directe."""

    result = llm.invoke([HumanMessage(content=prompt)])
    return str(result.content)

# ─── Explication IA d'une alerte (explainable alerts) ────────────
def expliquer_alerte(alerte_id: int) -> str:
    # Importer ici pour éviter une boucle d'imports (crud → rag → crud).
    from .. import crud
    from ..database import SessionLocal
    from ..models import Alerte

    db = SessionLocal()
    try:
        # Charge l'alerte + la mesure (qui porte l'ESP32 et la salle).
        alerte = (
            db.query(Alerte)
            .get(alerte_id)
        )
        if alerte is None:
            return ""

        mesure = getattr(alerte, "mesure", None)
        device = getattr(alerte, "esp32", None) or (getattr(mesure, "esp32", None) if mesure else None)
        salle = getattr(device, "salle", None) or (getattr(mesure, "topic_salle", None) if mesure else None)
        emplacement = salle or "Non spécifié"

        type_capteur = getattr(alerte, "type", None) or (getattr(mesure, "type", None) if mesure else None)
        valeur = getattr(mesure, "valeur", None) if mesure else None
        unite = (getattr(mesure, "unite", None) if mesure else None) or ""
        niveau = alerte.niveau

        # Seuil applicable (pour contextualiser la marge).
        seuil_dict = crud.SEUILS.get(type_capteur, {}) if type_capteur else {}
        if valeur is None or not type_capteur:
            return ""

        # Direction de la déviation (au-dessus max / en-dessous min / les deux).
        depassement = []
        smax = seuil_dict.get("max")
        smin = seuil_dict.get("min")
        if smax is not None and valeur > smax:
            marge = valeur - smax
            depassement.append(f"au-dessus du max ({smax} {unite}) de {marge:.2f} {unite}")
        if smin is not None and valeur < smin:
            marge = smin - valeur
            depassement.append(f"en-dessous du min ({smin} {unite}) de {marge:.2f} {unite}")

        # RAG : on cherche des protocoles / valeurs normales / gestes à faire.
        try:
            vectorstore = _get_vectorstore()
            query = f"protocole {type_capteur} {niveau} salle {salle or ''} valeur normale"
            docs = vectorstore.similarity_search(query, k=2)
            context = "\n\n---\n\n".join(d.page_content for d in docs) if docs else ""
        except Exception:
            context = ""

        from langchain_core.messages import HumanMessage

        # Construit le prompt hors f-string pour éviter les soucis de backslash
        # dans les expressions f-string en Python 3.11.
        seuil_min_part = (
            f" / {smin} {unite} (min)" if smin is not None else ""
        )
        deviation_part = (
            ", ".join(depassement) if depassement else "dans les normes (vérifier le contexte)"
        )
        niveau_label = (
            "critique" if niveau == "critique"
            else "attention" if niveau == "attention"
            else "informatif"
        )
        contexte_part = (
            f"Protocole de référence (extrait des documents indexés) :\n{context}\n"
            if context else ""
        )

        prompt = (
            "Tu es un assistant hospitalier expert pour le personnel du CHU Mohammed VI d'Oujda.\n\n"
            f"{contexte_part}"
            "Alerte en cours :\n"
            f"- Niveau : {niveau} ({niveau_label})\n"
            f"- Type de mesure : {type_capteur}\n"
            f"- Valeur relevée : {valeur} {unite}\n"
            f"- Seuil normal : {smax if smax is not None else '—'} {unite} (max){seuil_min_part}\n"
            f"- Déviation : {deviation_part}\n"
            f"- Emplacement : {emplacement}\n\n"
            "Rédige une explication concise en français, structurée en exactement 3 sections au format markdown :\n\n"
            "**Pourquoi** : explique en 1-2 phrases pourquoi cette valeur déclenche une alerte "
            "(marge par rapport au seuil, mécanisme physiologique ou technique).\n\n"
            "**Risques** : en 1-2 phrases, indique les risques concrets si aucune action n'est prise "
            "(sécurité patient, conformité, équipement).\n\n"
            "**Action recommandée** : en 1-2 phrases, propose une action concrète et vérifiable "
            "(vérification, ventilation, alerte équipe, isolement salle, etc.).\n\n"
            "Sois précis, factuel, et n'invente rien qui ne soit pas dans les protocoles. "
            "Si les documents indexés contiennent une procédure, cite-la brièvement."
        )

        llm = _get_llm()
        result = llm.invoke([HumanMessage(content=prompt)])
        explication = str(result.content).strip()

        if explication:
            from datetime import datetime, timezone
            alerte.explication = explication
            alerte.explication_cree_le = datetime.now(timezone.utc)
            db.commit()

        return explication
    finally:
        db.close()