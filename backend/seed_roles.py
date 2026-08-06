import sys
sys.path.insert(0, '.')
from app.database import engine, Base, SessionLocal
from app import models
from app.auth import hacher_mdp

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# (nom, email, password, role)
SEED_USERS = [
    ("Mohamed Talhaoui",  "admin@chuoujda.ma"  ,     "Admin@2026!",    "admin"),
    ("Mohamed Talhaoui",  "staff@chuoujda.ma"  ,     "Staff@2026!",    "hospital_staff"),
    ("Mohamed Talhaoui",  "visitor@chuoujda.ma",   "Visitor@2026!",    "visitor"),
]

for nom, email, password, role in SEED_USERS:
    existing = db.query(models.Utilisateur).filter_by(email=email).first()
    if existing:
        print(f"[SKIP] {email:30s} already exists (role={existing.role})")
        continue
    user = models.Utilisateur(
        nom=nom,
        email=email,
        mdp_hash=hacher_mdp(password),
        role=role,
    )
    db.add(user)
    db.commit()
    print(f"[OK]   {email:30s}  {role:15s}  password={password}")

print()
print("Login credentials (all passwords end with '@2026!'):")
print("  admin          : admin@chuoujda.ma     / Admin@2026!")
print("  hospital_staff : staff@chuoujda.ma     / Staff@2026!")
print("  visitor        : visitor@chuoujda.ma   / Visitor@2026!")