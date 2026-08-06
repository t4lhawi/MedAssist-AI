import os, shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, cast
from ..database import get_db, SessionLocal
from ..schemas import DocumentOut, DocumentUpdate
from ..auth import require_admin, require_hospital_staff
from ..config import settings
from .. import crud
from ..rag.pipeline import indexer_pdf, supprimer_document_index

router = APIRouter(prefix="/api/documents", tags=["Documents"])

# Read-only access (list / download) is shared with hospital staff.
# Uploads and deletes are admin-only.
@router.post("/", response_model=DocumentOut)
async def upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(require_admin),
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
        finally:
            db_index.close()

    background_tasks.add_task(_indexer, cast(int, doc.id), chemin, filename)
    return doc

@router.get("/", response_model=List[DocumentOut])
def lister(
    db: Session = Depends(get_db),
    user=Depends(require_hospital_staff),
):
    return crud.get_documents(db)

@router.get("/{doc_id}/file")
def telecharger(
    doc_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_hospital_staff),
):
    doc = crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document introuvable")
    chemin = cast(str, doc.chemin)
    nom = cast(str, doc.nom)
    if not os.path.exists(chemin):
        raise HTTPException(404, "Fichier physique introuvable")
    return FileResponse(
        chemin,
        media_type="application/pdf",
        filename=nom,
        # attachment so the browser triggers a save dialog with the
        # original filename, instead of opening the PDF inline.
        content_disposition_type="attachment",
    )

@router.delete("/{doc_id}")
def supprimer(
    doc_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
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

@router.patch("/{doc_id}", response_model=DocumentOut)
async def renommer(
    doc_id: int,
    payload: DocumentUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    doc = crud.get_document(db, doc_id)
    if not doc:
        raise HTTPException(404, "Document introuvable")

    ancien_nom = cast(str, doc.nom)
    ancien_chemin = cast(str, doc.chemin)
    nouveau_nom = payload.nom

    if nouveau_nom == ancien_nom:
        return doc

    collision = crud.get_document_by_nom(db, nouveau_nom)
    if collision is not None and collision.id != doc.id:
        raise HTTPException(
            409,
            f"Un document nommé « {nouveau_nom} » existe déjà",
        )
    nouveau_chemin = os.path.join(settings.UPLOAD_DIR, nouveau_nom)
    if os.path.exists(nouveau_chemin):
        raise HTTPException(
            409,
            f"Un fichier nommé « {nouveau_nom} » existe déjà sur le disque",
        )
    try:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        os.replace(ancien_chemin, nouveau_chemin)
    except OSError as e:
        raise HTTPException(
            500,
            f"Impossible de renommer le fichier sur le disque : {e}",
        )
    doc = crud.update_document_nom(
        db,
        doc_id,
        nouveau_nom=nouveau_nom,
        nouveau_chemin=nouveau_chemin,
    )
    if doc is None:
        try:
            os.replace(nouveau_chemin, ancien_chemin)
        except OSError:
            pass
        raise HTTPException(404, "Document introuvable")

    def _reindexer(doc_id: int, path: str, ancien: str, nouveau: str):
        from .. import models as _models
        db_index = SessionLocal()
        try:
            supprimer_document_index(ancien)
            n = indexer_pdf(path, nouveau)
            if n <= 0:
                raise ValueError(f"0 chunk produit pour {nouveau}")
            crud.marquer_indexe(db_index, doc_id)
            print(f"[rename] {ancien} → {nouveau}: {n} chunks ré-indexés")
        except Exception as e:
            print(
                f"[rename] ERREUR {ancien} → {nouveau}: "
                f"{type(e).__name__}: {e}"
            )
        finally:
            db_index.close()

    background_tasks.add_task(
        _reindexer, cast(int, doc.id), nouveau_chemin, ancien_nom, nouveau_nom,
    )
    return doc