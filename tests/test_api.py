from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.main import app


def test_health_ok():
    client = TestClient(app)
    response = client.get('/health')
    assert response.status_code == 200
    payload = response.json()
    assert payload['ok'] is True
    assert 'version' in payload


def test_register_login_and_event_flow():
    client = TestClient(app)

    email = f"admin_{int(datetime.now().timestamp())}@example.com"
    reg = client.post('/auth/register', json={
        'email': email,
        'password': 'secret123',
        'role': 'admin'
    })
    assert reg.status_code == 200

    login = client.post('/auth/login', json={'email': email, 'password': 'secret123'})
    assert login.status_code == 200
    token = login.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    start = datetime.now(timezone.utc) + timedelta(days=10)
    event = client.post('/events', json={
        'name': 'Evento Test',
        'description': 'Smoke test',
        'venue': 'Luna Park',
        'starts_at': start.isoformat(),
        'max_capacity': 200
    }, headers=headers)
    assert event.status_code == 200
    event_id = event.json()['id']

    publish = client.patch(f'/events/{event_id}/publish?published=true', headers=headers)
    assert publish.status_code == 200
    assert publish.json()['published'] is True
