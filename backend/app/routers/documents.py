import os, shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas import DocumentOut
from ..auth import get_current_user
from ..config import settings
from .. import crud
from ..rag.pipeline import indexer_pdf

router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.post("/", response_model=DocumentOut)
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Seuls les fichiers PDF sont acceptés")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    chemin = os.path.join(settings.UPLOAD_DIR, file.filename)
    with open(chemin, "wb") as f:
        shutil.copyfileobj(file.file, f)

    taille = os.path.getsize(chemin)
    doc = crud.create_document(db, nom=file.filename, chemin=chemin, taille=taille, user_id=user.id)

    # Indexation en arrière-plan
    def _indexer(doc_id: int, path: str, nom: str):
        try:
            indexer_pdf(path, nom)
            crud.marquer_indexe(db, doc_id)
        except Exception as e:
            print(f"Erreur indexation {nom}: {e}")

    background_tasks.add_task(_indexer, doc.id, chemin, file.filename)
    return doc

@router.get("/", response_model=List[DocumentOut])
def lister(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return crud.get_documents(db)

@router.delete("/{doc_id}")
def supprimer(doc_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    doc = crud.delete_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document introuvable")
    if os.path.exists(doc.chemin):
        os.remove(doc.chemin)
    return {"message": "Document supprimé"}
