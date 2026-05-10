import pytest


def _create(client, **overrides):
    payload = {
        "title": "Test",
        "exercise_type": "text",
        "language": "fr",
        "content": "Bonjour le monde",
    }
    payload.update(overrides)
    return client.post("/exercises", json=payload)


class TestCreateExercise:
    def test_creates_and_returns_exercise(self, client):
        resp = _create(client)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Test"
        assert "id" in data
        assert "created_at" in data

    def test_word_list_type_accepted(self, client):
        resp = _create(client, exercise_type="word_list", content="chat|chien")
        assert resp.status_code == 200
        assert resp.json()["exercise_type"] == "word_list"

    def test_invalid_type_returns_422(self, client):
        resp = _create(client, exercise_type="invalid")
        assert resp.status_code == 422

    def test_empty_title_returns_422(self, client):
        resp = _create(client, title="")
        assert resp.status_code == 422

    def test_empty_content_returns_422(self, client):
        resp = _create(client, content="")
        assert resp.status_code == 422

    def test_default_difficulty_is_easy(self, client):
        resp = _create(client)
        assert resp.json()["difficulty"] == "easy"

    def test_custom_difficulty_stored(self, client):
        resp = _create(client, difficulty="hard")
        assert resp.json()["difficulty"] == "hard"


class TestListExercises:
    def test_empty_db_returns_empty_list(self, client):
        resp = client.get("/exercises")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_created_exercises(self, client):
        _create(client, title="Ex1")
        _create(client, title="Ex2")
        resp = client.get("/exercises")
        titles = [e["title"] for e in resp.json()]
        assert "Ex1" in titles
        assert "Ex2" in titles

    def test_excludes_adaptive_difficulty(self, client):
        _create(client, title="Normal", difficulty="easy")
        _create(client, title="Adaptive", difficulty="adaptive")
        resp = client.get("/exercises")
        titles = [e["title"] for e in resp.json()]
        assert "Normal" in titles
        assert "Adaptive" not in titles

    def test_ordered_by_id_ascending(self, client):
        _create(client, title="First")
        _create(client, title="Second")
        ids = [e["id"] for e in client.get("/exercises").json()]
        assert ids == sorted(ids)


class TestGetExercise:
    def test_get_existing(self, client):
        exercise_id = _create(client).json()["id"]
        resp = client.get(f"/exercises/{exercise_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == exercise_id

    def test_get_nonexistent_returns_404(self, client):
        resp = client.get("/exercises/9999")
        assert resp.status_code == 404
