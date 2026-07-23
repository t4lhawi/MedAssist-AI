from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import ChatRequest, ChatResponse
from ..auth import get_current_user
from .. import crud
from ..rag.pipeline import repondre, interpreter_mesure

router = APIRouter(prefix="/api/chat", tags=["Assistant IA"])

@router.post("/", response_model=ChatResponse)
def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
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
def historique(db: Session = Depends(get_db), user=Depends(get_current_user)):
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
    user=Depends(get_current_user),
):
    deleted = crud.delete_conversation(db, user.id, conversation_id)
    if not deleted:
        raise HTTPException(404, "Conversation introuvable.")
    return {"deleted": True}

@router.delete("/historique")
def supprimer_historique(db: Session = Depends(get_db), user=Depends(get_current_user)):
    deleted = crud.delete_conversations(db, user.id)
    return {"deleted": deleted}

@router.post("/interpreter")
def interpreter(
    capteur_type: str, valeur: float, unite: str = "", emplacement: str = "",
    user=Depends(get_current_user)
):
    try:
        explication = interpreter_mesure(capteur_type, valeur, unite, emplacement)
        return {"explication": explication}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erreur IA : {type(e).__name__}: {e}")