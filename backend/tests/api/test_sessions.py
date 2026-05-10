from unittest.mock import patch

import pytest

FAKE_ANALYSIS = {
    "wpm": 60.0,
    "accuracy": 95.0,
    "error_count": 2,
    "latency_mean_ms": 120.0,
    "latency_median_ms": 110.0,
    "latency_p95_ms": 200.0,
    "backspace_count": 1,
    "mistakes_by_character": {"a": 1, "e": 1},
    "weak_words": {"bonjour": 1},
    "weak_sequences": {"bo": 1},
    "slow_characters": [["a", 150.0]],
    "slow_sequences": [["bo", 200.0]],
    "key_heatmap": {},
    "latency_character_stats": {"a": {"count": 3, "total_latency_ms": 300.0}},
    "latency_sequence_stats": {"bo": {"count": 2, "total_latency_ms": 200.0}},
    "suggested_focus": ["Travailler 'a'"],
}

_COMPLETE_PAYLOAD = {
    "typed_text": "Bonjour le monde",
    "duration_seconds": 20.0,
    "error_count": 2,
    "error_events": [],
    "key_events": [],
}


def _make_exercise(client, content="Bonjour le monde"):
    return client.post("/exercises", json={
        "title": "Session test",
        "exercise_type": "text",
        "language": "fr",
        "content": content,
    }).json()


def _start(client, exercise_id, user_name="alice", word_count=None):
    payload = {"exercise_id": exercise_id, "user_name": user_name}
    if word_count:
        payload["word_count"] = word_count
    return client.post("/sessions/start", json=payload)


class TestStartSession:
    def test_creates_session(self, client):
        ex = _make_exercise(client)
        resp = _start(client, ex["id"])
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "started"
        assert data["user_name"] == "alice"

    def test_reference_text_equals_content_for_text_type(self, client):
        ex = _make_exercise(client, content="Texte de référence")
        resp = _start(client, ex["id"])
        assert resp.json()["reference_text"] == "Texte de référence"

    def test_word_list_reference_uses_word_count(self, client):
        ex = client.post("/exercises", json={
            "title": "WL",
            "exercise_type": "word_list",
            "language": "fr",
            "content": "chat|chien|maison|voiture|arbre|table|livre|école|ville|route",
        }).json()
        resp = _start(client, ex["id"], word_count=30)
        words = resp.json()["reference_text"].split()
        assert len(words) == 30

    def test_unknown_exercise_returns_404(self, client):
        resp = _start(client, exercise_id=9999)
        assert resp.status_code == 404

    def test_empty_user_name_returns_422(self, client):
        ex = _make_exercise(client)
        resp = client.post("/sessions/start", json={
            "exercise_id": ex["id"],
            "user_name": "   ",
        })
        assert resp.status_code == 422

    def test_word_count_out_of_range_returns_422(self, client):
        ex = _make_exercise(client)
        resp = client.post("/sessions/start", json={
            "exercise_id": ex["id"],
            "user_name": "alice",
            "word_count": 10,
        })
        assert resp.status_code == 422


class TestCompleteSession:
    def test_returns_result_with_metrics(self, client):
        ex = _make_exercise(client)
        session = _start(client, ex["id"]).json()
        with patch("app.api.routes.sessions.analyze_typing", return_value=FAKE_ANALYSIS):
            resp = client.post(f"/sessions/{session['id']}/complete", json=_COMPLETE_PAYLOAD)
        assert resp.status_code == 200
        data = resp.json()
        assert data["wpm"] == 60.0
        assert data["accuracy"] == 95.0
        assert data["error_count"] == 2

    def test_session_status_becomes_completed(self, client):
        ex = _make_exercise(client)
        session = _start(client, ex["id"]).json()
        with patch("app.api.routes.sessions.analyze_typing", return_value=FAKE_ANALYSIS):
            client.post(f"/sessions/{session['id']}/complete", json=_COMPLETE_PAYLOAD)
        get_resp = client.get(f"/sessions/{session['id']}")
        assert get_resp.json()["status"] == "completed"

    def test_completing_twice_returns_400(self, client):
        ex = _make_exercise(client)
        session = _start(client, ex["id"]).json()
        with patch("app.api.routes.sessions.analyze_typing", return_value=FAKE_ANALYSIS):
            client.post(f"/sessions/{session['id']}/complete", json=_COMPLETE_PAYLOAD)
            resp = client.post(f"/sessions/{session['id']}/complete", json=_COMPLETE_PAYLOAD)
        assert resp.status_code == 400

    def test_nonexistent_session_returns_404(self, client):
        with patch("app.api.routes.sessions.analyze_typing", return_value=FAKE_ANALYSIS):
            resp = client.post("/sessions/9999/complete", json=_COMPLETE_PAYLOAD)
        assert resp.status_code == 404

    def test_analysis_service_failure_returns_503(self, client):
        ex = _make_exercise(client)
        session = _start(client, ex["id"]).json()
        with patch(
            "app.api.routes.sessions.analyze_typing",
            side_effect=Exception("Service down"),
        ):
            resp = client.post(f"/sessions/{session['id']}/complete", json=_COMPLETE_PAYLOAD)
        assert resp.status_code == 503


class TestGetSession:
    def test_get_existing_session(self, client):
        ex = _make_exercise(client)
        session = _start(client, ex["id"]).json()
        resp = client.get(f"/sessions/{session['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == session["id"]

    def test_get_nonexistent_returns_404(self, client):
        resp = client.get("/sessions/9999")
        assert resp.status_code == 404
