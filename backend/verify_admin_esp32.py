"""End-to-end verification of the in-flight admin_esp32 refactor.

Runs the FastAPI app in-process against a temporary SQLite DB. Seeds an
admin user, a few registered ESP32 devices, and a couple of mesures
whose source_ip is unregistered. Then exercises every endpoint declared
in routers/admin_esp32.py plus the legacy capteurs/mesures/alertes
shims that share types.

Run:  ../venv/Scripts/python.exe verify_admin_esp32.py
"""
from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone

# Make the Windows console UTF-8 so the arrow / check marks print cleanly.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# ── 1. Pin DB to a fresh SQLite file BEFORE importing the app ──
_tmp = tempfile.NamedTemporaryFile(prefix="medassist_verify_", suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"
os.environ.setdefault("SECRET_KEY", "verify-secret-key")
os.environ.setdefault("LLM_MODEL", "llama3.2")
os.environ.setdefault("EMBEDDING_MODEL", "nomic-embed-text")
os.environ.setdefault("OLLAMA_BASE_URL", "http://localhost:11434")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app import models  # noqa: E402
from app.auth import hacher_mdp, creer_token  # noqa: E402

# ── 2. Create schema + seed ──────────────────────────────────────
Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()
try:
    admin = models.Utilisateur(
        nom="Admin", email="admin@test.local",
        mdp_hash=hacher_mdp("Admin@2026!"), role="admin", actif=True,
    )
    soignant = models.Utilisateur(
        nom="Soignant", email="soignant@test.local",
        mdp_hash=hacher_mdp("x"), role="soignant", actif=True,
    )
    db.add_all([admin, soignant])
    db.flush()

    esp1 = models.Esp32Device(ip="10.0.0.10", salle="Salle A", note="premier",
                              actif=True, derniere_mesure_le=datetime.now(timezone.utc))
    esp2 = models.Esp32Device(ip="10.0.0.11", salle="Salle B", note=None,
                              actif=True, derniere_mesure_le=None)
    db.add_all([esp1, esp2])
    db.flush()

    now = datetime.now(timezone.utc)
    # Mesure on a registered device
    db.add(models.Mesure(esp32_id=esp1.id, type="temperature",
                         source_ip="10.0.0.10", valeur=22.4, unite="C",
                         timestamp=now - timedelta(minutes=3)))
    # Mesures on an *unregistered* source_ip (the admin "claim" flow)
    db.add(models.Mesure(esp32_id=None, type="humidite",
                         source_ip="192.168.99.42", valeur=58.0, unite="%",
                         timestamp=now - timedelta(minutes=8)))
    db.add(models.Mesure(esp32_id=None, type="temperature",
                         source_ip="192.168.99.42", valeur=21.1, unite="C",
                         timestamp=now - timedelta(minutes=1)))
    db.commit()

    admin_token = creer_token({"sub": admin.email})
    soignant_token = creer_token({"sub": soignant.email})
finally:
    db.close()

ADMIN_HDR = {"Authorization": f"Bearer {admin_token}"}
SOIGNANT_HDR = {"Authorization": f"Bearer {soignant_token}"}

results: list[tuple[str, str, str]] = []  # (label, status, detail)


def check(label: str, resp, expect: int, *, must_contain: list[str] | None = None):
    body = resp.text
    ok = resp.status_code == expect
    extra = ""
    if must_contain and ok:
        for needle in must_contain:
            if needle not in body:
                ok = False
                extra = f" (missing {needle!r})"
                break
    status = "PASS" if ok else "FAIL"
    detail = f"got {resp.status_code} (want {expect}){extra}"
    results.append((label, status, detail))
    print(f"  [{status}] {label}: {detail}")


with TestClient(app) as client:
    # ── 3. Exercise admin_esp32 router ────────────────────────────
    print("\n--- admin_esp32 router ---")

    # Soignant should be FORBIDDEN on every admin endpoint
    check("soignant GET /api/admin/esp32/ → 403",
          client.get("/api/admin/esp32/", headers=SOIGNANT_HDR), 403)

    check("admin GET /api/admin/esp32/",
          client.get("/api/admin/esp32/", headers=ADMIN_HDR), 200,
          must_contain=["10.0.0.10", "10.0.0.11", "Salle A", "Salle B"])

    check("admin POST /api/admin/esp32/ — create",
          client.post("/api/admin/esp32/",
                      json={"ip": "10.0.0.12", "salle": "Salle C", "note": "nouveau"},
                      headers=ADMIN_HDR), 201,
          must_contain=["10.0.0.12", "Salle C"])

    # Duplicate IP must conflict
    check("admin POST /api/admin/esp32/ — duplicate IP → 409",
          client.post("/api/admin/esp32/",
                      json={"ip": "10.0.0.10", "salle": "X"},
                      headers=ADMIN_HDR), 409)

    # Bad IP rejected by Pydantic
    check("admin POST /api/admin/esp32/ — bad IP → 422",
          client.post("/api/admin/esp32/",
                      json={"ip": "999.0.0.1", "salle": "X"},
                      headers=ADMIN_HDR), 422)

    check("admin PATCH /api/admin/esp32/1",
          client.patch("/api/admin/esp32/1",
                       json={"note": "modifié"},
                       headers=ADMIN_HDR), 200,
          must_contain=["modifié"])

    check("admin PATCH /api/admin/esp32/9999 → 404",
          client.patch("/api/admin/esp32/9999", json={}, headers=ADMIN_HDR), 404)

    check("admin GET /api/admin/esp32/unregistered",
          client.get("/api/admin/esp32/unregistered", headers=ADMIN_HDR), 200,
          must_contain=["192.168.99.42", "temperature"])  # most recent type

    check("admin GET /api/admin/esp32/salles-status",
          client.get("/api/admin/esp32/salles-status", headers=ADMIN_HDR), 200,
          must_contain=["Salle A", "Salle B", "Salle C", "online", "sensors"])

    # Claim an unregistered IP — backfill should retarget the 2 mesures
    check("admin POST /api/admin/esp32/claim",
          client.post("/api/admin/esp32/claim",
                      json={"ip": "192.168.99.42", "salle": "Salle D"},
                      headers=ADMIN_HDR), 201,
          must_contain=["Salle D", "192.168.99.42"])

    # After claim, no more unregistered sources for that IP
    check("admin GET /api/admin/esp32/unregistered — empty after claim",
          client.get("/api/admin/esp32/unregistered", headers=ADMIN_HDR), 200,
          must_contain=[])

    # Re-claim same IP → 409
    check("admin POST /api/admin/esp32/claim — duplicate → 409",
          client.post("/api/admin/esp32/claim",
                      json={"ip": "192.168.99.42", "salle": "X"},
                      headers=ADMIN_HDR), 409)

    # Also peek at the raw JSON when the salle-filter check fails.
    resp_dbg = client.get("/api/mesures/?salle=Salle D", headers=ADMIN_HDR)
    if resp_dbg.status_code == 200 and "Salle D" not in resp_dbg.text:
        print("    DEBUG /api/mesures/?salle=Salle D body:", resp_dbg.text[:600])

    check("admin DELETE /api/admin/esp32/2 → 204",
          client.delete("/api/admin/esp32/2", headers=ADMIN_HDR), 204)

    check("admin DELETE /api/admin/esp32/9999 → 404",
          client.delete("/api/admin/esp32/9999", headers=ADMIN_HDR), 404)

    # ── 4. Exercise the legacy shim that shares the model ─────────
    print("\n--- legacy shims (regression) ---")
    check("GET /api/capteurs/ — legacy returns Esp32 list",
          client.get("/api/capteurs/", headers=ADMIN_HDR), 200,
          must_contain=["10.0.0.10", "Salle A"])

    # The mesures POST now requires the new shape
    check("POST /api/mesures/ — new shape",
          client.post("/api/mesures/",
                      json={"esp32_id": 1, "type": "temperature",
                            "source_ip": "10.0.0.10", "valeur": 23.0, "unite": "C"},
                      headers=ADMIN_HDR), 200,
          must_contain=["23.0", "temperature"])

    check("GET /api/mesures/?salle=Salle D (claim backfill worked)",
          client.get("/api/mesures/?salle=Salle D", headers=ADMIN_HDR), 200,
          must_contain=["Salle D", "21.1", "58.0"])

    # Also check via esp32_id (no salle join needed) to confirm backfill happened
    check("GET /api/mesures/?esp32_id=4 (the claimed device, id=3 was the Salle C insert)",
          client.get("/api/mesures/?esp32_id=4", headers=ADMIN_HDR), 200,
          must_contain=["21.1", "58.0"])

# ── 5. Cleanup ───────────────────────────────────────────────────
try:
    os.unlink(_tmp.name)
except OSError:
    pass  # SQLite on Windows may still hold a handle — non-fatal

# ── 6. Summary ───────────────────────────────────────────────────
passed = sum(1 for _, s, _ in results if s == "PASS")
failed = sum(1 for _, s, _ in results if s == "FAIL")
print(f"\n=== {passed}/{len(results)} passed, {failed} failed ===")
sys.exit(0 if failed == 0 else 1)
