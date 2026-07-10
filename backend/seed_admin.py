"""
Script de création du premier compte administrateur.
Lancer UNE SEULE FOIS après le premier démarrage :
  docker exec medassist_api python seed_admin.py
"""
import sys
sys.path.insert(0, '.')
from app.database import engine, Base, SessionLocal
from app import models
from app.auth import hacher_mdp

Base.metadata.create_all(bind=engine)
db = SessionLocal()

admin_email = "admin@medassist.ma"
if db.query(models.Utilisateur).filter_by(email=admin_email).first():
    print(f"✅ Admin déjà existant ({admin_email})")
else:
    admin = models.Utilisateur(
        nom="Administrateur",
        email=admin_email,
        mdp_hash=hacher_mdp("Admin@2026!"),
        role="admin"
    )
    db.add(admin); db.commit()
    print(f"✅ Admin créé : {admin_email} / Admin@2026!")

# Créer des capteurs de démo
capteurs_demo = [
    models.Capteur(nom="Capteur Salle 101", type="temperature", emplacement="Salle de soins 101"),
    models.Capteur(nom="Capteur Salle 101", type="humidite", emplacement="Salle de soins 101"),
]
for c in capteurs_demo:
    if not db.query(models.Capteur).filter_by(nom=c.nom).first():
        db.add(c)
db.commit()
print("✅ Capteurs de démo créés")
db.close()
