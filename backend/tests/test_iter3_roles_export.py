"""
Iteration 3 regression tests for Auxible India:
- Owner & HR login (full staff access)
- /api/admin/* requires staff (owner|hr), employee gets 403
- Venues & Jobs endpoints REMOVED -> 404
- /api/users/{id}/export returns valid PDF for staff, 403 for employee
- /api/admin/analytics pivoted to employee/updates metrics (no jobs/venues)
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")

OWNER = {"email": "owner@auxibleindia.com", "password": "Owner@2026"}
HR = {"email": "hr@auxibleindia.com", "password": "Hr@2026"}
EMP = {"email": "rahul@auxibleindia.com", "password": "Employee@123"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    return r


@pytest.fixture(scope="module")
def owner_token():
    r = _login(OWNER)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["user"]["role"] == "owner"
    return j["token"]


@pytest.fixture(scope="module")
def hr_token():
    r = _login(HR)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["user"]["role"] == "hr"
    return j["token"]


@pytest.fixture(scope="module")
def emp_token():
    r = _login(EMP)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["user"]["role"] == "employee"
    return j["token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- Auth ----------
class TestAuthRoles:
    def test_owner_login(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=H(owner_token))
        assert r.status_code == 200
        assert r.json()["role"] == "owner"

    def test_hr_login(self, hr_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=H(hr_token))
        assert r.status_code == 200
        assert r.json()["role"] == "hr"

    def test_legacy_admin_removed(self):
        r = _login({"email": "admin@auxibleindia.com", "password": "Auxible@2026"})
        assert r.status_code == 401


# ---------- Staff role gating ----------
class TestStaffGating:
    def test_admin_live_owner(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/admin/live", headers=H(owner_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_live_hr(self, hr_token):
        r = requests.get(f"{BASE_URL}/api/admin/live", headers=H(hr_token))
        assert r.status_code == 200

    def test_admin_live_employee_forbidden(self, emp_token):
        r = requests.get(f"{BASE_URL}/api/admin/live", headers=H(emp_token))
        assert r.status_code == 403

    def test_admin_updates_employee_forbidden(self, emp_token):
        r = requests.get(f"{BASE_URL}/api/admin/updates", headers=H(emp_token))
        assert r.status_code == 403

    def test_admin_attendance_owner(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/admin/attendance", headers=H(owner_token))
        assert r.status_code == 200


# ---------- Removed features ----------
class TestRemovedFeatures:
    def test_venues_removed(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/venues", headers=H(owner_token))
        assert r.status_code == 404

    def test_jobs_removed(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/jobs", headers=H(owner_token))
        assert r.status_code == 404

    def test_jobs_post_removed(self, owner_token):
        r = requests.post(f"{BASE_URL}/api/jobs", headers=H(owner_token), json={})
        assert r.status_code == 404


# ---------- Analytics pivot ----------
class TestAnalyticsPivot:
    def test_analytics_keys_owner(self, owner_token):
        r = requests.get(f"{BASE_URL}/api/admin/analytics", headers=H(owner_token))
        assert r.status_code == 200
        d = r.json()
        for k in [
            "total_employees", "active_employees", "flagged", "active_today",
            "total_updates", "total_hours", "updates_by_status", "updates_last_7_days",
        ]:
            assert k in d, f"missing key {k}"
        # No job/venue keys
        assert "jobs_by_status" not in d
        assert "venues_by_type" not in d
        assert isinstance(d["updates_last_7_days"], list)
        assert len(d["updates_last_7_days"]) == 7

    def test_analytics_hr(self, hr_token):
        r = requests.get(f"{BASE_URL}/api/admin/analytics", headers=H(hr_token))
        assert r.status_code == 200

    def test_analytics_employee_forbidden(self, emp_token):
        r = requests.get(f"{BASE_URL}/api/admin/analytics", headers=H(emp_token))
        assert r.status_code == 403


# ---------- PDF Export ----------
class TestPdfExport:
    @pytest.fixture(scope="class")
    def employee_id(self, owner_token):
        # Create a fresh test employee
        uniq = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_Export_{uniq}",
            "email": f"test_export_{uniq}@auxibleindia.com",
            "password": "Test@1234",
            "phone": "9999999999",
            "designation": "QA",
            "employee_code": f"TEST-{uniq}",
        }
        r = requests.post(f"{BASE_URL}/api/users", headers=H(owner_token), json=payload)
        assert r.status_code == 200, r.text
        eid = r.json()["id"]
        yield eid
        requests.delete(f"{BASE_URL}/api/users/{eid}", headers=H(owner_token))

    def test_export_owner_returns_pdf(self, owner_token, employee_id):
        r = requests.get(f"{BASE_URL}/api/users/{employee_id}/export", headers=H(owner_token))
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content.startswith(b"%PDF")
        assert "attachment" in r.headers.get("content-disposition", "").lower()

    def test_export_hr_returns_pdf(self, hr_token, employee_id):
        r = requests.get(f"{BASE_URL}/api/users/{employee_id}/export", headers=H(hr_token))
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")

    def test_export_employee_forbidden(self, emp_token, employee_id):
        r = requests.get(f"{BASE_URL}/api/users/{employee_id}/export", headers=H(emp_token))
        assert r.status_code == 403

    def test_export_unauth(self, employee_id):
        r = requests.get(f"{BASE_URL}/api/users/{employee_id}/export")
        assert r.status_code == 401


# ---------- Employee CRUD by HR ----------
class TestHrCanManageEmployees:
    def test_hr_can_create_and_delete_employee(self, hr_token):
        uniq = uuid.uuid4().hex[:6]
        payload = {
            "name": f"TEST_HR_{uniq}",
            "email": f"test_hr_{uniq}@auxibleindia.com",
            "password": "Test@1234",
        }
        r = requests.post(f"{BASE_URL}/api/users", headers=H(hr_token), json=payload)
        assert r.status_code == 200, r.text
        eid = r.json()["id"]
        # GET via list
        r2 = requests.get(f"{BASE_URL}/api/users", headers=H(hr_token))
        assert r2.status_code == 200
        ids = [u["id"] for u in r2.json()]
        assert eid in ids
        # Delete
        r3 = requests.delete(f"{BASE_URL}/api/users/{eid}", headers=H(hr_token))
        assert r3.status_code == 200
