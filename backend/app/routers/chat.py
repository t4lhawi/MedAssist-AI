from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import ChatRequest, ChatResponse
from ..auth import require_hospital_staff
from .. import crud
from ..rag.pipeline import repondre, interpreter_mesure

router = APIRouter(prefix="/api/chat", tags=["Assistant IA"])

# The RAG assistant is open to admin, hospital_staff, AND visitors
# (visitors are the "ask the AI about my data" use-case). Mutating
# actions on a user's own history are available to the same set.
# We use ``require_hospital_staff`` which also admits admin, then add
# ``require_visitor`` endpoints by composing a custom dependency via
# ``require_roles``.
from ..auth import require_roles  # local import to keep the module tidy

CHAT_USER = require_roles("admin", "hospital_staff", "visitor")

@router.post("/", response_model=ChatResponse)
def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(CHAT_USER),
):
    try:
        reponse, sources = repondre(data.question, data.historique)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erreur IA : {type(e).__name__}: {e}")

    crud.save_conversation(db, user.id, data.question, reponse, sources)
    return ChatResponse(reponse=reponse, sources=sources)

@router.get("/historique")
def historique(db: Session = Depends(get_db), user=Depends(CHAT_USER)):
    convs = crud.get_conversations(db, user.id)
    return [
        {
            "id": c.id,
            "question": c.question,
            "reponse": c.reponse,
            "sources": c.sources,
            "date": c.cree_le,
        }
        for c in convs
    ]

@router.delete("/historique/{conversation_id}")
def supprimer_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user=Depends(CHAT_USER),
):
    deleted = crud.delete_conversation(db, user.id, conversation_id)
    if not deleted:
        raise HTTPException(404, "Conversation introuvable.")
    return {"deleted": True}

@router.delete("/historique")
def supprimer_historique(db: Session = Depends(get_db), user=Depends(CHAT_USER)):
    deleted = crud.delete_conversations(db, user.id)
    return {"deleted": deleted}

@router.post("/interpreter")
def interpreter(
    capteur_type: str, valeur: float, unite: str = "", emplacement: str = "",
    user=Depends(require_hospital_staff),
):
    # Interpreting a sensor reading is a staff-only action (visitors
    # don't need to run their own threshold checks).
    try:
        explication = interpreter_mesure(capteur_type, valeur, unite, emplacement)
        return {"explication": explication}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erreur IA : {type(e).__name__}: {e}")