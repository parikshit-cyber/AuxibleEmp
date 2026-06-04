"""Backend tests for Auxible India Activity Tracker."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "owner@auxibleindia.com"
ADMIN_PASS = "Owner@2026"
EMP_EMAIL = "rahul@auxibleindia.com"
EMP_PASS = "Employee@123"

@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]
@pytest.fixture(scope="session")
def emp_token():
    r = requests.post(f"{API}/auth/login", json={"email": EMP_EMAIL, "password": EMP_PASS}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---- Auth ----
class TestAuth:
    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and data["user"]["role"] == "owner"

    def test_employee_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": EMP_EMAIL, "password": EMP_PASS})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "employee"

    def test_invalid_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ---- Employee management ----
class TestEmployees:
    created_id = None
    created_email = None

    def test_list_employees_requires_admin(self, emp_token):
        r = requests.get(f"{API}/users", headers=_h(emp_token))
        assert r.status_code == 403

    def test_create_employee(self, admin_token):
        email = f"test_{uuid.uuid4().hex[:8]}@auxibleindia.com"
        payload = {"name": "Test Emp", "email": email, "password": "Test@1234",
                   "phone": "9999999999", "designation": "Engineer", "employee_code": "AUX-T01"}
        r = requests.post(f"{API}/users", json=payload, headers=_h(admin_token))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email
        assert data["name"] == "Test Emp"
        assert data["role"] == "employee"
        TestEmployees.created_id = data["id"]
        TestEmployees.created_email = email

    def test_list_contains_created(self, admin_token):
        r = requests.get(f"{API}/users", headers=_h(admin_token))
        assert r.status_code == 200
        emails = [u["email"] for u in r.json()]
        assert TestEmployees.created_email in emails

    def test_duplicate_email(self, admin_token):
        r = requests.post(f"{API}/users", json={
            "name": "Dup", "email": TestEmployees.created_email, "password": "x"
        }, headers=_h(admin_token))
        assert r.status_code == 400

    def test_delete_employee(self, admin_token):
        r = requests.delete(f"{API}/users/{TestEmployees.created_id}", headers=_h(admin_token))
        assert r.status_code == 200


# ---- Attendance ----
class TestAttendance:
    def test_attendance_today_initial(self, emp_token):
        r = requests.get(f"{API}/attendance/today", headers=_h(emp_token))
        assert r.status_code == 200

    def test_checkin_and_checkout(self, emp_token):
        # checkin (may fail if already checked in today)
        r = requests.post(f"{API}/attendance/checkin", json={"lat": 12.97, "lng": 77.59, "address": "BLR"},
                          headers=_h(emp_token))
        assert r.status_code in (200, 400)
        # verify today shows check_in
        t = requests.get(f"{API}/attendance/today", headers=_h(emp_token)).json()
        assert t.get("current_check_in")
        # checkout - allow either already-checked-out or success
        time.sleep(1)
        r = requests.post(f"{API}/attendance/checkout", json={"lat": 12.97, "lng": 77.59},
                          headers=_h(emp_token))
        assert r.status_code in (200, 400)
        t = requests.get(f"{API}/attendance/today", headers=_h(emp_token)).json()
        assert "completed_seconds_today" in t

    def test_history(self, emp_token):
        r = requests.get(f"{API}/attendance/history", headers=_h(emp_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_attendance(self, admin_token):
        r = requests.get(f"{API}/admin/attendance", headers=_h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---- Location ping ----
class TestLocation:
    def test_ping(self, emp_token):
        r = requests.post(f"{API}/location/ping", json={
            "lat": 12.9716, "lng": 77.5946, "accuracy": 10,
            "battery_level": 80, "battery_charging": False,
            "network_type": "wifi", "network_effective": "4g"
        }, headers=_h(emp_token))
        assert r.status_code == 200

    def test_admin_live_reflects_ping(self, admin_token, emp_token):
        # send another ping
        requests.post(f"{API}/location/ping", json={
            "lat": 19.07, "lng": 72.87, "battery_level": 55, "network_type": "4g"
        }, headers=_h(emp_token))
        r = requests.get(f"{API}/admin/live", headers=_h(admin_token))
        assert r.status_code == 200
        rows = r.json()
        rahul = next((x for x in rows if x["user"]["email"] == EMP_EMAIL), None)
        assert rahul is not None
        assert rahul["live"] is not None
        assert rahul["live"]["lat"] == 19.07
        assert rahul["live"]["battery_level"] == 55


# ---- Work updates ----
class TestUpdates:
    created_status = "working"

    def test_create_update(self, emp_token):
        r = requests.post(f"{API}/updates", json={
            "project_name": "TEST_Project_X", "status": "working",
            "note": "Working on integration", "client_name": "ClientCo",
            "site_details": "Site A", "lat": 12.97, "lng": 77.59
        }, headers=_h(emp_token))
        assert r.status_code == 200
        assert r.json()["project_name"] == "TEST_Project_X"

    def test_my_updates(self, emp_token):
        r = requests.get(f"{API}/updates", headers=_h(emp_token))
        assert r.status_code == 200
        assert any(u["project_name"] == "TEST_Project_X" for u in r.json())

    def test_admin_updates(self, admin_token):
        r = requests.get(f"{API}/admin/updates", headers=_h(admin_token))
        assert r.status_code == 200
        assert any(u["project_name"] == "TEST_Project_X" for u in r.json())


# ---- Flags / notifications ----
class TestFlags:
    def test_flag_and_unflag(self, admin_token, emp_token):
        me = requests.get(f"{API}/auth/me", headers=_h(emp_token)).json()
        uid = me["id"]
        # Mark red
        r = requests.post(f"{API}/admin/flag/{uid}", json={"flag_type": "red", "message": "Please check in"},
                          headers=_h(admin_token))
        assert r.status_code == 200
        # Notification should appear
        n = requests.get(f"{API}/notifications", headers=_h(emp_token))
        assert n.status_code == 200
        assert any(x["type"] == "red" for x in n.json())
        # Contact owner
        r = requests.post(f"{API}/admin/flag/{uid}", json={"flag_type": "contact", "message": "Call me"},
                          headers=_h(admin_token))
        assert r.status_code == 200
        # Unflag
        r = requests.post(f"{API}/admin/unflag/{uid}", headers=_h(admin_token))
        assert r.status_code == 200
        live = requests.get(f"{API}/admin/live", headers=_h(admin_token)).json()
        rahul = next((x for x in live if x["user"]["email"] == EMP_EMAIL), None)
        assert rahul["user"]["flagged"] is False


# ---- Stats ----
class TestStats:
    def test_stats(self, admin_token):
        r = requests.get(f"{API}/admin/stats", headers=_h(admin_token))
        assert r.status_code == 200
        data = r.json()
        for k in ("total_employees", "checked_in", "flagged", "updates_today"):
            assert k in data





