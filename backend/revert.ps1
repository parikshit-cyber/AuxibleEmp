$content = Get-Content tests/test_activity_tracker.py -Raw
$content = $content -replace '@pytest\.fixture\(scope="session"\)`n    def client\(\):`n        with TestClient\(app\) as c:`n            yield c', "import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
API = f'{BASE_URL}/api'"
$content = $content -replace 'from fastapi\.testclient import TestClient\r?\nfrom server import app\r?\n', ''
$content = $content -replace 'client\.post\(', 'requests.post(f"{API}'
$content = $content -replace 'client\.get\(', 'requests.get(f"{API}'
$content = $content -replace 'client\.delete\(', 'requests.delete(f"{API}'
$content = $content -replace '"/api/', '/" + "'
Set-Content tests/test_activity_tracker.py $content
