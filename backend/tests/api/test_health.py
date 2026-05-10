from unittest.mock import patch


def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "backend"


def test_analysis_health_ok(client):
    with patch(
        "app.api.routes.health.get_analysis_health",
        return_value={"status": "ok", "service": "analysis"},
    ):
        resp = client.get("/analysis/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["analysis"]["status"] == "ok"


def test_analysis_health_unavailable(client):
    with patch(
        "app.api.routes.health.get_analysis_health",
        side_effect=Exception("Connection refused"),
    ):
        resp = client.get("/analysis/health")
    assert resp.status_code == 503
