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
    models.Capteur(nom="Temperature", type="temperature", emplacement="Salle 1"),
    models.Capteur(nom="Humidite", type="humidite", emplacement="Salle 1"),
    models.Capteur(nom="Pression", type="pression", emplacement="Salle 1"),
    models.Capteur(nom="Qualite Air", type="qualite_air", emplacement="Salle 1"),
]

for c in capteurs_demo:
    if not db.query(models.Capteur).filter_by(nom=c.nom, type=c.type, emplacement=c.emplacement).first():
        db.add(c)
db.commit()
print("✅ Capteurs de démo créés")
db.close()
