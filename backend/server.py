from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"

app = FastAPI(title="Auxible India - Activity Tracker")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("activity_tracker")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def serialize_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "email": doc.get("email"),
        "name": doc.get("name"),
        "role": doc.get("role"),
        "phone": doc.get("phone", ""),
        "designation": doc.get("designation", ""),
        "employee_code": doc.get("employee_code", ""),
        "active": doc.get("active", True),
        "flagged": doc.get("flagged", False),
        "flag_type": doc.get("flag_type"),
        "flag_reason": doc.get("flag_reason"),
        "created_at": doc.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


STAFF_ROLES = {"owner", "hr", "admin"}


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Staff access required")
    return user


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class EmployeeIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = ""
    designation: Optional[str] = ""
    employee_code: Optional[str] = ""


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None


class GeoIn(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = ""
    device: Optional[dict] = None


class PingIn(BaseModel):
    lat: float
    lng: float
    accuracy: Optional[float] = None
    battery_level: Optional[int] = None
    battery_charging: Optional[bool] = None
    network_type: Optional[str] = None
    network_effective: Optional[str] = None
    address: Optional[str] = ""
    device: Optional[dict] = None


class WorkUpdateIn(BaseModel):
    project_name: str
    status: str  # visiting | working | break
    note: str
    client_name: Optional[str] = ""
    site_details: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = ""


class FlagIn(BaseModel):
    flag_type: str  # red | contact
    message: str


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact admin.")
    token = create_access_token(str(user["_id"]), user["email"], user["role"])
    return {"token": token, "user": serialize_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


# ---------------------------------------------------------------------------
# Employee management (admin)
# ---------------------------------------------------------------------------
@api.post("/users")
async def create_employee(body: EmployeeIn, admin: dict = Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "employee",
        "phone": body.phone or "",
        "designation": body.designation or "",
        "employee_code": body.employee_code or "",
        "active": True,
        "flagged": False,
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize_user(doc)


@api.get("/users")
async def list_employees(admin: dict = Depends(require_admin)):
    users = await db.users.find({"role": "employee"}).sort("created_at", -1).to_list(1000)
    return [serialize_user(u) for u in users]


@api.patch("/users/{user_id}")
async def update_employee(user_id: str, body: EmployeeUpdate, admin: dict = Depends(require_admin)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None and k != "password"}
    if body.password:
        updates["password_hash"] = hash_password(body.password)
    if updates:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_user(user)


@api.delete("/users/{user_id}")
async def delete_employee(user_id: str, admin: dict = Depends(require_admin)):
    await db.users.delete_one({"_id": ObjectId(user_id), "role": "employee"})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Attendance (session based — multiple check-ins per day supported)
# ---------------------------------------------------------------------------
async def get_open_session(user_id: str):
    return await db.attendance.find_one(
        {"user_id": user_id, "check_out": None}, sort=[("check_in", -1)]
    )


@api.post("/attendance/checkin")
async def checkin(body: GeoIn, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    if await get_open_session(uid):
        raise HTTPException(status_code=400, detail="You are already checked in. Please check out first.")
    geo = body.model_dump()
    device = geo.pop("device", None)
    doc = {
        "user_id": uid,
        "date": today_str(),
        "check_in": now_iso(),
        "check_out": None,
        "check_in_location": geo,
        "check_out_location": None,
        "check_in_device": device,
        "worked_seconds": 0,
    }
    res = await db.attendance.insert_one(dict(doc))
    return {"ok": True, "check_in": doc["check_in"], "session_id": str(res.inserted_id)}


@api.post("/attendance/checkout")
async def checkout(body: GeoIn, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    sess = await get_open_session(uid)
    if not sess:
        raise HTTPException(status_code=400, detail="You are not checked in.")
    ci = datetime.fromisoformat(sess["check_in"])
    worked = int((datetime.now(timezone.utc) - ci).total_seconds())
    geo = body.model_dump()
    geo.pop("device", None)
    await db.attendance.update_one(
        {"_id": sess["_id"]},
        {"$set": {"check_out": now_iso(), "check_out_location": geo, "worked_seconds": worked}},
    )
    return {"ok": True, "worked_seconds": worked}


@api.get("/attendance/today")
async def attendance_today(user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    sessions = await db.attendance.find({"user_id": uid, "date": today_str()}).sort("check_in", -1).to_list(100)
    open_sess = next((s for s in sessions if not s.get("check_out")), None)
    completed = sum(s.get("worked_seconds", 0) for s in sessions if s.get("check_out"))
    last_out = next((s.get("check_out") for s in sessions if s.get("check_out")), None)
    return {
        "active": open_sess is not None,
        "current_check_in": open_sess["check_in"] if open_sess else None,
        "last_check_out": last_out,
        "sessions_today": len(sessions),
        "completed_seconds_today": completed,
    }


@api.get("/attendance/history")
async def attendance_history(user: dict = Depends(get_current_user)):
    rows = await db.attendance.find({"user_id": str(user["_id"])}).sort("check_in", -1).to_list(300)
    for r in rows:
        r.pop("_id", None)
    return rows


@api.get("/admin/attendance")
async def admin_attendance(admin: dict = Depends(require_admin)):
    rows = await db.attendance.find().sort("check_in", -1).to_list(1000)
    users = {str(u["_id"]): u for u in await db.users.find().to_list(1000)}
    out = []
    for r in rows:
        u = users.get(r["user_id"], {})
        r.pop("_id", None)
        out.append({**r, "name": u.get("name"), "employee_code": u.get("employee_code", "")})
    return out


# ---------------------------------------------------------------------------
# Location pings + telemetry
# ---------------------------------------------------------------------------
@api.post("/location/ping")
async def location_ping(body: PingIn, user: dict = Depends(get_current_user)):
    uid = str(user["_id"])
    doc = {**body.model_dump(), "user_id": uid, "timestamp": now_iso()}
    await db.locations.insert_one(dict(doc))
    await db.live_location.update_one({"user_id": uid}, {"$set": doc}, upsert=True)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Work updates / On-duty logs
# ---------------------------------------------------------------------------
@api.post("/updates")
async def create_update(body: WorkUpdateIn, user: dict = Depends(get_current_user)):
    doc = {**body.model_dump(), "user_id": str(user["_id"]), "timestamp": now_iso()}
    res = await db.updates.insert_one(dict(doc))
    doc["id"] = str(res.inserted_id)
    return doc


@api.get("/updates")
async def my_updates(user: dict = Depends(get_current_user)):
    rows = await db.updates.find({"user_id": str(user["_id"])}).sort("timestamp", -1).to_list(200)
    for r in rows:
        r["id"] = str(r.pop("_id"))
    return rows


@api.get("/admin/updates")
async def all_updates(admin: dict = Depends(require_admin)):
    rows = await db.updates.find().sort("timestamp", -1).to_list(500)
    users = {str(u["_id"]): u for u in await db.users.find().to_list(1000)}
    for r in rows:
        u = users.get(r["user_id"], {})
        r["id"] = str(r.pop("_id"))
        r["name"] = u.get("name")
        r["employee_code"] = u.get("employee_code", "")
    return rows


# ---------------------------------------------------------------------------
# Admin live monitor
# ---------------------------------------------------------------------------
@api.get("/admin/live")
async def admin_live(admin: dict = Depends(require_admin)):
    employees = await db.users.find({"role": "employee"}).sort("name", 1).to_list(1000)
    out = []
    for u in employees:
        uid = str(u["_id"])
        live = await db.live_location.find_one({"user_id": uid})
        open_sess = await db.attendance.find_one({"user_id": uid, "check_out": None}, sort=[("check_in", -1)])
        last_session = await db.attendance.find_one({"user_id": uid}, sort=[("check_in", -1)])
        sessions_today = await db.attendance.count_documents({"user_id": uid, "date": today_str()})
        last_update = await db.updates.find_one({"user_id": uid}, sort=[("timestamp", -1)])
        att = open_sess or last_session
        if live:
            live.pop("_id", None)
        if att:
            att.pop("_id", None)
        if last_update:
            last_update["id"] = str(last_update.pop("_id"))
        if open_sess:
            status = "checked_in"
        elif sessions_today > 0:
            status = "checked_out"
        else:
            status = "offline"
        out.append({
            "user": serialize_user(u),
            "live": live,
            "attendance": att,
            "sessions_today": sessions_today,
            "last_update": last_update,
            "status": status,
        })
    return out


@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    total = await db.users.count_documents({"role": "employee"})
    checked_in = await db.attendance.count_documents(
        {"date": today_str(), "check_in": {"$ne": None}, "check_out": None}
    )
    flagged = await db.users.count_documents({"role": "employee", "flagged": True})
    updates_today = await db.updates.count_documents({"timestamp": {"$gte": today_str()}})
    return {"total_employees": total, "checked_in": checked_in, "flagged": flagged, "updates_today": updates_today}


# ---------------------------------------------------------------------------
# Flags / Warnings + Notifications
# ---------------------------------------------------------------------------
@api.post("/admin/flag/{user_id}")
async def flag_employee(user_id: str, body: FlagIn, admin: dict = Depends(require_admin)):
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"flagged": True, "flag_type": body.flag_type, "flag_reason": body.message}},
    )
    title = "⚠ Marked Red by Management" if body.flag_type == "red" else "📞 Contact Owner Immediately"
    await db.notifications.insert_one({
        "user_id": user_id,
        "type": body.flag_type,
        "title": title,
        "message": body.message,
        "read": False,
        "created_at": now_iso(),
    })
    return {"ok": True}


@api.post("/admin/unflag/{user_id}")
async def unflag_employee(user_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"flagged": False, "flag_type": None, "flag_reason": None}},
    )
    return {"ok": True}


@api.get("/notifications")
async def my_notifications(user: dict = Depends(get_current_user)):
    rows = await db.notifications.find({"user_id": str(user["_id"])}).sort("created_at", -1).to_list(100)
    for r in rows:
        r["id"] = str(r.pop("_id"))
    return rows


@api.post("/notifications/{notif_id}/read")
async def read_notification(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "user_id": str(user["_id"])}, {"$set": {"read": True}}
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Delete a work update (owner of update or admin)
# ---------------------------------------------------------------------------
@api.delete("/updates/{update_id}")
async def delete_update(update_id: str, user: dict = Depends(get_current_user)):
    upd = await db.updates.find_one({"_id": ObjectId(update_id)})
    if not upd:
        raise HTTPException(status_code=404, detail="Update not found")
    if user.get("role") not in STAFF_ROLES and upd["user_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.updates.delete_one({"_id": ObjectId(update_id)})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Employee PDF export (staff: owner / hr)
# ---------------------------------------------------------------------------
@api.get("/users/{user_id}/export")
async def export_employee_pdf(user_id: str, staff: dict = Depends(require_admin)):
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.pdfgen import canvas
    from fastapi.responses import Response

    emp = await db.users.find_one({"_id": ObjectId(user_id)})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if emp.get("role") != "employee":
        raise HTTPException(status_code=400, detail="Only employees can be exported")

    att = await db.attendance.find({"user_id": user_id}).sort("date", -1).to_list(200)
    updates = await db.updates.find({"user_id": user_id}).sort("timestamp", -1).to_list(20)
    total_hours = round(sum(a.get("worked_seconds", 0) for a in att) / 3600, 1)

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4
    gold = colors.HexColor("#D4AF37")
    dark = colors.HexColor("#111111")

    c.setFillColor(dark); c.rect(0, H - 90, W, 90, fill=1, stroke=0)
    c.setFillColor(gold); c.setFont("Helvetica-Bold", 22); c.drawString(40, H - 50, "AUXIBLE INDIA")
    c.setFillColor(colors.white); c.setFont("Helvetica", 10); c.drawString(40, H - 68, "Employee Report")
    c.setFont("Helvetica", 9)
    c.drawRightString(W - 40, H - 50, datetime.now(timezone.utc).strftime("Generated: %d %b %Y"))

    y = H - 130

    def line(label, value):
        nonlocal y
        c.setFillColor(colors.grey); c.setFont("Helvetica", 9); c.drawString(40, y, label.upper())
        c.setFillColor(dark); c.setFont("Helvetica-Bold", 12); c.drawString(40, y - 15, str(value or "-"))
        y -= 38

    c.setFillColor(dark); c.setFont("Helvetica-Bold", 16); c.drawString(40, y, emp.get("name", "")); y -= 30
    line("Employee Code", emp.get("employee_code"))
    line("Email", emp.get("email"))
    line("Phone", emp.get("phone"))
    line("Designation", emp.get("designation"))
    line("Status", "Active" if emp.get("active", True) else "Inactive")
    line("Flag", emp.get("flag_reason") if emp.get("flagged") else "No active flags")

    c.setFillColor(gold); c.setFont("Helvetica-Bold", 13); c.drawString(40, y, "Attendance Summary"); y -= 22
    c.setFillColor(dark); c.setFont("Helvetica", 11)
    c.drawString(40, y, f"Total days recorded: {len(att)}     Total hours worked: {total_hours}h"); y -= 32

    c.setFillColor(gold); c.setFont("Helvetica-Bold", 13); c.drawString(40, y, "Recent Work Updates"); y -= 20
    c.setFillColor(dark); c.setFont("Helvetica", 10)
    if not updates:
        c.drawString(40, y, "No updates submitted."); y -= 16
    for u in updates[:14]:
        if y < 60:
            c.showPage(); y = H - 60
        ts = (u.get("timestamp") or "")[:10]
        txt = f"- [{ts}] {u.get('project_name','')} ({u.get('status','')}): {u.get('note','')}"
        c.drawString(40, y, txt[:96]); y -= 16

    c.showPage(); c.save(); buf.seek(0)
    fname = (emp.get("name") or "employee").replace(" ", "_")
    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={fname}_report.pdf"},
    )


# ---------------------------------------------------------------------------
# Analytics (admin)
# ---------------------------------------------------------------------------
@api.get("/admin/analytics")
async def admin_analytics(admin: dict = Depends(require_admin)):
    total_employees = await db.users.count_documents({"role": "employee"})
    active_employees = await db.users.count_documents({"role": "employee", "active": True})
    flagged = await db.users.count_documents({"role": "employee", "flagged": True})
    checked_in = await db.attendance.count_documents(
        {"date": today_str(), "check_in": {"$ne": None}, "check_out": None}
    )
    total_updates = await db.updates.count_documents({})
    all_att = await db.attendance.find().to_list(5000)
    total_hours = round(sum(a.get("worked_seconds", 0) for a in all_att) / 3600, 1)
    by_status = {}
    for u in await db.updates.find().to_list(5000):
        s = u.get("status", "working")
        by_status[s] = by_status.get(s, 0) + 1
    days = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        cnt = await db.updates.count_documents({"timestamp": {"$gte": d, "$lt": d + "T99"}})
        days.append({"date": d, "count": cnt})
    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "flagged": flagged,
        "active_today": checked_in,
        "total_updates": total_updates,
        "total_hours": total_hours,
        "updates_by_status": [{"name": k, "value": v} for k, v in by_status.items()],
        "updates_last_7_days": days,
    }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)

    async def ensure_user(email, password, name, role):
        email = email.lower()
        existing = await db.users.find_one({"email": email})
        if existing is None:
            await db.users.insert_one({
                "email": email,
                "password_hash": hash_password(password),
                "name": name,
                "role": role,
                "active": True,
                "created_at": now_iso(),
            })
            logger.info(f"Seeded {role} user {email}")
        else:
            updates = {"role": role}
            if not verify_password(password, existing["password_hash"]):
                updates["password_hash"] = hash_password(password)
            await db.users.update_one({"email": email}, {"$set": updates})

    await ensure_user(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"], "Owner", "owner")
    await ensure_user(os.environ["HR_EMAIL"], os.environ["HR_PASSWORD"], "HR Manager", "hr")
    await ensure_user("rahul@auxibleindia.com", "Employee@123", "Rahul Kumar", "employee")
    # Remove any legacy "admin" role accounts (migrated to owner/hr)
    await db.users.delete_many({"role": "admin"})


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port)

