import sys
sys.path.insert(0, '.')
from app.database import engine, Base, SessionLocal
from app import models
from app.auth import hacher_mdp

Base.metadata.create_all(bind=engine)
db = SessionLocal()

admin_email = "admin@chuoujda.ma"
if db.query(models.Utilisateur).filter_by(email=admin_email).first():
    print(f"[INFO] Admin already exists ({admin_email})")
else:
    admin = models.Utilisateur(
        nom="Mohamed Talhaoui",
        email=admin_email,
        mdp_hash=hacher_mdp("Admin@2026!"),
        role="admin"
    )
    db.add(admin); db.commit()
    print(f"[INFO] Admin created: {admin_email} / Admin@2026!")
pass