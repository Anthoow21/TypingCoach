from unittest.mock import patch

from app.core.recommendation_engine import MIN_COMPLETED_SESSIONS

FAKE_ANALYSIS = {
    "wpm": 65.0,
    "accuracy": 92.0,
    "error_count": 3,
    "latency_mean_ms": 110.0,
    "latency_median_ms": 105.0,
    "latency_p95_ms": 180.0,
    "backspace_count": 1,
    "mistakes_by_character": {"a": 5, "e": 3, "i": 2},
    "weak_words": {"bonjour": 2},
    "weak_sequences": {"bo": 3, "on": 2},
    "slow_characters": [["z", 300.0]],
    "slow_sequences": [["zz", 350.0]],
    "key_heatmap": {},
    "latency_character_stats": {"z": {"count": 4, "total_latency_ms": 1200.0}},
    "latency_sequence_stats": {"zz": {"count": 3, "total_latency_ms": 900.0}},
    "suggested_focus": [],
}


def _setup_sessions(client, user_name, count):
    ex = client.post("/exercises", json={
        "title": "Reco test",
        "exercise_type": "text",
        "language": "fr",
        "content": "Bonjour le monde voici un test de frappe",
    }).json()
    for _ in range(count):
        session = client.post("/sessions/start", json={
            "exercise_id": ex["id"],
            "user_name": user_name,
        }).json()
        with patch("app.api.routes.sessions.analyze_typing", return_value=FAKE_ANALYSIS):
            client.post(f"/sessions/{session['id']}/complete", json={
                "typed_text": "Bonjour le monde voici un test de frappe",
                "duration_seconds": 20.0,
                "error_count": 3,
                "error_events": [],
                "key_events": [],
            })


class TestGetRecommendations:
    def test_ineligible_with_no_sessions(self, client):
        resp = client.get("/recommendations/alice")
        assert resp.status_code == 200
        data = resp.json()
        assert data["eligible"] is False
        assert data["sessions_remaining"] == MIN_COMPLETED_SESSIONS

    def test_ineligible_with_insufficient_sessions(self, client):
        _setup_sessions(client, "alice", count=5)
        resp = client.get("/recommendations/alice")
        assert resp.status_code == 200
        data = resp.json()
        assert data["eligible"] is False
        assert data["sessions_remaining"] == MIN_COMPLETED_SESSIONS - 5

    def test_eligible_with_enough_sessions(self, client):
        _setup_sessions(client, "alice", count=MIN_COMPLETED_SESSIONS)
        resp = client.get("/recommendations/alice")
        assert resp.status_code == 200
        data = resp.json()
        assert data["eligible"] is True
        assert data["completed_sessions"] == MIN_COMPLETED_SESSIONS

    def test_weakness_summary_always_present(self, client):
        resp = client.get("/recommendations/alice")
        assert resp.status_code == 200
        assert resp.json()["weakness_summary"] is not None

    def test_weakness_populated_after_sessions(self, client):
        _setup_sessions(client, "alice", count=MIN_COMPLETED_SESSIONS)
        data = client.get("/recommendations/alice").json()
        summary = data["weakness_summary"]
        assert isinstance(summary["top_error_characters"], list)

    def test_user_name_in_response(self, client):
        data = client.get("/recommendations/alice").json()
        assert data["user_name"] == "alice"


class TestStartRecommendationSession:
    _payload = {
        "title": "Reco session",
        "exercise_type": "word_list",
        "language": "fr",
        "content": "chat|chien|maison|voiture|arbre|table|livre|école|ville|route",
        "difficulty": "adaptive",
        "word_count": 25,
        "user_name": "alice",
    }

    def test_creates_session(self, client):
        resp = client.post("/recommendations/start", json=self._payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "started"
        assert data["user_name"] == "alice"

    def test_reference_text_generated(self, client):
        resp = client.post("/recommendations/start", json=self._payload)
        words = resp.json()["reference_text"].split()
        assert len(words) == 25

    def test_invalid_exercise_type_returns_422(self, client):
        payload = dict(self._payload)
        payload["exercise_type"] = "invalid"
        resp = client.post("/recommendations/start", json=payload)
        assert resp.status_code == 422
