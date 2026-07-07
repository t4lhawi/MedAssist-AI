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
        crud.save_conversation(db, user.id, data.question, reponse, sources)
        return ChatResponse(reponse=reponse, sources=sources)
    except Exception as e:
        raise HTTPException(500, f"Erreur IA : {str(e)}")

@router.get("/historique")
def historique(db: Session = Depends(get_db), user=Depends(get_current_user)):
    convs = crud.get_conversations(db, user.id)
    return [{"question": c.question, "reponse": c.reponse, "sources": c.sources, "date": c.cree_le} for c in convs]

@router.post("/interpreter")
def interpreter(
    capteur_type: str, valeur: float, unite: str = "", emplacement: str = "",
    user=Depends(get_current_user)
):
    try:
        explication = interpreter_mesure(capteur_type, valeur, unite, emplacement)
        return {"explication": explication}
    except Exception as e:
        raise HTTPException(500, f"Erreur IA : {str(e)}")
