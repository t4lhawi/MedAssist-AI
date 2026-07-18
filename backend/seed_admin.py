import sys
sys.path.insert(0, '.')
from app.database import engine, Base, SessionLocal
from app import models
from app.auth import hacher_mdp

Base.metadata.create_all(bind=engine)
db = SessionLocal()

admin_email = "admin@medassist.ma"
if db.query(models.Utilisateur).filter_by(email=admin_email).first():
    print(f"[INFO] Admin already exists ({admin_email})")
else:
    admin = models.Utilisateur(
        nom="Administrateur",
        email=admin_email,
        mdp_hash=hacher_mdp("Admin@2026!"),
        role="admin"
    )
    db.add(admin); db.commit()
    print(f"[INFO] Admin created: {admin_email} / Admin@2026!")

# Note: Capteur model is deprecated; demo sensor creation removed.
# Use the API to create Esp32Device and Mesure records as needed.
pass
