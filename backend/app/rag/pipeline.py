"""
Pipeline RAG – MedAssist AI
100% gratuit avec Ollama (LLM + embeddings locaux)
"""
from functools import lru_cache
from typing import List, Tuple, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from chromadb.config import Settings as ChromaSettings
from ..config import settings


# ─── Embeddings (vecteurs de texte) ──────────────────────────────
@lru_cache(maxsize=1)
def _get_embeddings():
    if settings.LLM_PROVIDER == "ollama":
        # Modèle d'embedding gratuit et léger via Ollama
        from langchain_community.embeddings import OllamaEmbeddings
        return OllamaEmbeddings(
            base_url=settings.OLLAMA_BASE_URL,
            model="nomic-embed-text"   # petit modèle, rapide
        )
    elif settings.LLM_PROVIDER == "gemini":
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        return GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.GEMINI_API_KEY
        )
    elif settings.LLM_PROVIDER == "groq":
        # Groq n'a pas d'embeddings → on utilise un modèle HuggingFace local léger
        from langchain_community.embeddings import HuggingFaceEmbeddings
        return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    else:  # openai
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)


# ─── LLM ─────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def _get_llm():
    if settings.LLM_PROVIDER == "ollama":
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.LLM_MODEL,   # llama3.2 par défaut
            temperature=0.1,
            num_predict=settings.LLM_MAX_TOKENS,
            timeout=settings.LLM_TIMEOUT_SECONDS,
            keep_alive=settings.OLLAMA_KEEP_ALIVE,
        )
    elif settings.LLM_PROVIDER == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL or "gemini-1.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.1
        )
    elif settings.LLM_PROVIDER == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=settings.LLM_MODEL or "llama3-8b-8192",
            groq_api_key=settings.GROQ_API_KEY,
            temperature=0.1,
            max_tokens=settings.LLM_MAX_TOKENS,
        )
    else:  # openai
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.LLM_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
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
    """Supprime les chunks Chroma associes a un document."""
    vectorstore = _get_vectorstore()
    vectorstore._collection.delete(where={"source_document": nom_document})
    _persist_vectorstore(vectorstore)


# ─── Indexation d'un PDF ─────────────────────────────────────────
def indexer_pdf(chemin_pdf: str, nom_document: str) -> int:
    """Charge un PDF, le découpe en chunks et l'indexe dans ChromaDB."""
    loader = PyPDFLoader(chemin_pdf)
    pages = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    chunks = splitter.split_documents(pages)

    for chunk in chunks:
        chunk.metadata["source_document"] = nom_document

    vectorstore = _get_vectorstore()
    vectorstore._collection.delete(where={"source_document": nom_document})
    vectorstore.add_documents(chunks)
    _persist_vectorstore(vectorstore)
    return len(chunks)


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
    """Génère une réponse RAG. Retourne (réponse, sources)."""
    vectorstore = _get_vectorstore()
    llm = _get_llm()

    # Recherche des passages pertinents
    resultats = vectorstore.similarity_search_with_score(question, k=RETRIEVAL_K)

    if not resultats:
        return (
            "Aucun document n'a encore été indexé. "
            "Veuillez téléverser des documents PDF depuis la section Documents.",
            []
        )

    # Chroma retourne des distances dont l'echelle depend du modele d'embeddings.
    # Avec Ollama/nomic-embed-text, les passages pertinents peuvent avoir des
    # scores de plusieurs centaines. On garde donc les meilleurs resultats et on
    # laisse le prompt interdire les reponses hors documents.
    context_parts, sources = [], []
    for doc, score in resultats:
        if not doc.page_content.strip():
            continue

        source_document = doc.metadata.get("source_document", "Inconnu")
        page = doc.metadata.get("page", "?")
        context_parts.append(
            f"Source: {source_document}, page {page}\n{doc.page_content}"
        )
        src = {
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

    from langchain.schema import SystemMessage, HumanMessage, AIMessage
    messages = [SystemMessage(content=prompt)]

    if historique:
        for msg in historique[-6:]:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=question))

    reponse = llm.invoke(messages)
    return (reponse.content, sources)


# ─── Interprétation d'une mesure capteur ─────────────────────────
def interpreter_mesure(type_capteur: str, valeur: float, unite: str, emplacement: str) -> str:
    """Génère une explication IA pour une mesure de capteur."""
    llm = _get_llm()

    # Chercher des protocoles liés dans les documents
    try:
        vectorstore = _get_vectorstore()
        docs = vectorstore.similarity_search(
            f"valeurs recommandées {type_capteur} {emplacement}", k=2
        )
        context = "\n".join([d.page_content for d in docs]) if docs else ""
    except Exception:
        context = ""

    from langchain.schema import HumanMessage
    prompt = f"""Tu es un assistant hospitalier expert.
{f'Protocole de référence : {context}' if context else ''}

Mesure relevée :
- Type de mesure : {type_capteur}
- Valeur : {valeur} {unite}
- Emplacement : {emplacement or 'Non spécifié'}

En 2 à 3 phrases, indique si cette valeur est dans les normes, et si une action est nécessaire.
Réponds en français, de manière claire et directe."""

    result = llm.invoke([HumanMessage(content=prompt)])
    return result.content
