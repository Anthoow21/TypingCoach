from unittest.mock import patch

FAKE_ANALYSIS = {
    "wpm": 55.0,
    "accuracy": 90.0,
    "error_count": 3,
    "latency_mean_ms": 100.0,
    "latency_median_ms": 95.0,
    "latency_p95_ms": 180.0,
    "backspace_count": 0,
    "mistakes_by_character": {},
    "weak_words": {},
    "weak_sequences": {},
    "slow_characters": [],
    "slow_sequences": [],
    "key_heatmap": {},
    "latency_character_stats": {},
    "latency_sequence_stats": {},
    "suggested_focus": [],
}


def _complete_session(client, user_name="bob"):
    ex = client.post("/exercises", json={
        "title": "Result test",
        "exercise_type": "text",
        "language": "fr",
        "content": "Hello world test",
    }).json()
    session = client.post("/sessions/start", json={
        "exercise_id": ex["id"],
        "user_name": user_name,
    }).json()
    with patch("app.api.routes.sessions.analyze_typing", return_value=FAKE_ANALYSIS):
        result = client.post(f"/sessions/{session['id']}/complete", json={
            "typed_text": "Hello world test",
            "duration_seconds": 15.0,
            "error_count": 3,
            "error_events": [],
            "key_events": [],
        }).json()
    return result, session, ex


class TestListResults:
    def test_empty_returns_empty_list(self, client):
        resp = client.get("/results")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_completed_results(self, client):
        _complete_session(client)
        resp = client.get("/results")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_multiple_results(self, client):
        _complete_session(client, user_name="alice")
        _complete_session(client, user_name="bob")
        resp = client.get("/results")
        assert len(resp.json()) == 2


class TestGetResult:
    def test_get_by_id(self, client):
        result, _, _ = _complete_session(client)
        resp = client.get(f"/results/{result['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == result["id"]

    def test_get_nonexistent_returns_404(self, client):
        resp = client.get("/results/9999")
        assert resp.status_code == 404

    def test_result_contains_exercise_metadata(self, client):
        result, _, ex = _complete_session(client)
        data = client.get(f"/results/{result['id']}").json()
        assert data["exercise_title"] == ex["title"]
        assert data["exercise_type"] == ex["exercise_type"]

    def test_result_contains_user_name(self, client):
        result, _, _ = _complete_session(client, user_name="alice")
        data = client.get(f"/results/{result['id']}").json()
        assert data["user_name"] == "alice"


class TestGetResultBySession:
    def test_get_by_session_id(self, client):
        result, session, _ = _complete_session(client)
        resp = client.get(f"/results/session/{session['id']}")
        assert resp.status_code == 200
        assert resp.json()["session_id"] == session["id"]

    def test_nonexistent_session_returns_404(self, client):
        resp = client.get("/results/session/9999")
        assert resp.status_code == 404
