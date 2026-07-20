import os, shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, cast
from ..database import get_db, SessionLocal
from ..schemas import DocumentOut
from ..auth import get_current_user
from ..config import settings
from .. import crud
from ..rag.pipeline import indexer_pdf, supprimer_document_index

router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.post("/", response_model=DocumentOut)
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    filename = os.path.basename(file.filename or "")
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Seuls les fichiers PDF sont acceptés")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    chemin = os.path.join(settings.UPLOAD_DIR, filename)
    with open(chemin, "wb") as f:
        shutil.copyfileobj(file.file, f)

    taille = os.path.getsize(chemin)
    doc = crud.create_document(db, nom=filename, chemin=chemin, taille=taille, user_id=user.id)

    # Indexation en arrière-plan
    def _indexer(doc_id: int, path: str, nom: str):
        from .. import models as _models
        db_index = SessionLocal()
        try:
            n = indexer_pdf(path, nom)
            if n <= 0:
                # indexer_pdf is supposed to raise on 0 chunks, but guard anyway
                raise ValueError(f"0 chunk produit pour {nom}")
            crud.marquer_indexe(db_index, doc_id)
            print(f"[index] {nom}: {n} chunks indexés")
        except Exception as e:
            print(f"[index] ERREUR {nom}: {type(e).__name__}: {e}")
            # Make sure indexe stays False and we record why in a transient
            # attribute the UI can read on next poll. We don't add a column
            # to the schema to avoid a migration — we just print.
        finally:
            db_index.close()

    background_tasks.add_task(_indexer, cast(int, doc.id), chemin, filename)
    return doc

@router.get("/", response_model=List[DocumentOut])
def lister(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return crud.get_documents(db)

@router.delete("/{doc_id}")
def supprimer(doc_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    doc = crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document introuvable")
    nom = cast(str, doc.nom)
    chemin = cast(str, doc.chemin)
    crud.delete_document(db, doc_id)
    try:
        supprimer_document_index(nom)
    except Exception as e:
        print(f"Erreur suppression index {nom}: {e}")
    if os.path.exists(chemin):
        os.remove(chemin)
    return {"message": "Document supprimé"}
