from unittest.mock import patch

FAKE_ANALYSIS = {
    "wpm": 60.0,
    "accuracy": 95.0,
    "error_count": 0,
    "latency_mean_ms": 100.0,
    "latency_median_ms": 95.0,
    "latency_p95_ms": 150.0,
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

_SERIES_PAYLOAD = {
    "user_name": "alice",
    "number_of_exercises": 2,
    "exercise_modes": ["text"],
    "allowed_word_counts": [25],
}


def _create_text_exercise(client):
    return client.post("/exercises", json={
        "title": "Series test",
        "exercise_type": "text",
        "language": "fr",
        "content": "Voici un texte pour la série de test",
    }).json()


def _create_series(client, **overrides):
    payload = dict(_SERIES_PAYLOAD)
    payload.update(overrides)
    return client.post("/practice-series", json=payload)


class TestCreatePracticeSeries:
    def test_creates_series(self, client):
        _create_text_exercise(client)
        resp = _create_series(client)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_exercises"] == 2
        assert data["status"] == "started"
        assert data["user_name"] == "alice"

    def test_no_exercises_available_returns_400(self, client):
        resp = _create_series(client)
        assert resp.status_code == 400

    def test_invalid_user_name_returns_422(self, client):
        _create_text_exercise(client)
        resp = _create_series(client, user_name="")
        assert resp.status_code == 422

    def test_too_many_exercises_returns_422(self, client):
        _create_text_exercise(client)
        resp = _create_series(client, number_of_exercises=21)
        assert resp.status_code == 422

    def test_zero_exercises_returns_422(self, client):
        _create_text_exercise(client)
        resp = _create_series(client, number_of_exercises=0)
        assert resp.status_code == 422

    def test_invalid_exercise_mode_returns_422(self, client):
        _create_text_exercise(client)
        resp = _create_series(client, exercise_modes=["invalid"])
        assert resp.status_code == 422


class TestGetPracticeSeries:
    def test_get_existing_series(self, client):
        _create_text_exercise(client)
        series = _create_series(client).json()
        resp = client.get(f"/practice-series/{series['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == series["id"]

    def test_get_nonexistent_returns_404(self, client):
        resp = client.get("/practice-series/9999")
        assert resp.status_code == 404


class TestGetPracticeSeriesSessions:
    def test_returns_pre_generated_sessions(self, client):
        _create_text_exercise(client)
        series = _create_series(client, number_of_exercises=3).json()
        resp = client.get(f"/practice-series/{series['id']}/sessions")
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    def test_sessions_belong_to_series(self, client):
        _create_text_exercise(client)
        series = _create_series(client).json()
        sessions = client.get(f"/practice-series/{series['id']}/sessions").json()
        for session in sessions:
            assert session["practice_series_id"] == series["id"]

    def test_nonexistent_series_returns_404(self, client):
        resp = client.get("/practice-series/9999/sessions")
        assert resp.status_code == 404


class TestGetPracticeSeriesSummary:
    def _complete_series(self, client, n=1):
        _create_text_exercise(client)
        series = _create_series(client, number_of_exercises=n).json()
        sessions = client.get(f"/practice-series/{series['id']}/sessions").json()
        for session in sessions:
            with patch("app.api.routes.sessions.analyze_typing", return_value=FAKE_ANALYSIS):
                client.post(f"/sessions/{session['id']}/complete", json={
                    "typed_text": "Voici un texte pour la serie de test",
                    "duration_seconds": 10.0,
                    "error_count": 0,
                    "error_events": [],
                    "key_events": [],
                })
        return series

    def test_summary_after_completion(self, client):
        series = self._complete_series(client, n=2)
        resp = client.get(f"/practice-series/{series['id']}/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["completed_sessions"] == 2
        assert data["average_wpm"] == 60.0

    def test_summary_marks_series_completed(self, client):
        series = self._complete_series(client, n=1)
        client.get(f"/practice-series/{series['id']}/summary")
        series_data = client.get(f"/practice-series/{series['id']}").json()
        assert series_data["status"] == "completed"

    def test_nonexistent_series_returns_404(self, client):
        resp = client.get("/practice-series/9999/summary")
        assert resp.status_code == 404
