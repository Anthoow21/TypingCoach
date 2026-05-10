from unittest.mock import patch

FAKE_ANALYSIS = {
    "wpm": 70.0,
    "accuracy": 98.0,
    "error_count": 1,
    "latency_mean_ms": 90.0,
    "latency_median_ms": 85.0,
    "latency_p95_ms": 150.0,
    "backspace_count": 0,
    "mistakes_by_character": {"a": 2, "e": 1},
    "weak_words": {"bonjour": 1},
    "weak_sequences": {"bo": 2},
    "slow_characters": [["z", 200.0]],
    "slow_sequences": [["zz", 250.0]],
    "key_heatmap": {"A": {"hits": 10, "errors": 1, "total_latency_ms": 900.0}},
    "latency_character_stats": {"a": {"count": 5, "total_latency_ms": 500.0}},
    "latency_sequence_stats": {"bo": {"count": 3, "total_latency_ms": 600.0}},
    "suggested_focus": [],
}


def _setup_user(client, user_name="alice", count=1):
    ex = client.post("/exercises", json={
        "title": "Stats test",
        "exercise_type": "text",
        "language": "fr",
        "content": "Bonjour le monde",
    }).json()
    for _ in range(count):
        session = client.post("/sessions/start", json={
            "exercise_id": ex["id"],
            "user_name": user_name,
        }).json()
        with patch("app.api.routes.sessions.analyze_typing", return_value=FAKE_ANALYSIS):
            client.post(f"/sessions/{session['id']}/complete", json={
                "typed_text": "Bonjour le monde",
                "duration_seconds": 15.0,
                "error_count": 1,
                "error_events": [],
                "key_events": [],
            })


class TestGetUserStats:
    def test_returns_stats_for_user(self, client):
        _setup_user(client, "alice")
        resp = client.get("/stats/user/alice")
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_name"] == "alice"
        assert data["total_completed_sessions"] == 1
        assert data["average_wpm"] == 70.0
        assert data["average_accuracy"] == 98.0

    def test_unknown_user_returns_404(self, client):
        resp = client.get("/stats/user/nobody")
        assert resp.status_code == 404

    def test_scope_standard_excludes_adaptive(self, client):
        _setup_user(client, "alice")
        resp = client.get("/stats/user/alice?scope=standard")
        assert resp.status_code == 200

    def test_scope_all_returns_results(self, client):
        _setup_user(client, "alice")
        resp = client.get("/stats/user/alice?scope=all")
        assert resp.status_code == 200
        assert resp.json()["total_completed_sessions"] == 1

    def test_aggregates_multiple_sessions(self, client):
        _setup_user(client, "alice", count=3)
        data = client.get("/stats/user/alice").json()
        assert data["total_completed_sessions"] == 3

    def test_top_error_characters_populated(self, client):
        _setup_user(client, "alice")
        data = client.get("/stats/user/alice").json()
        assert isinstance(data["top_characters"], list)

    def test_keyboard_heatmap_populated(self, client):
        _setup_user(client, "alice")
        data = client.get("/stats/user/alice").json()
        assert isinstance(data["keyboard_heatmap"], dict)

    def test_recent_sessions_in_response(self, client):
        _setup_user(client, "alice")
        data = client.get("/stats/user/alice").json()
        assert len(data["recent_sessions"]) == 1


class TestListUsers:
    def test_returns_users_with_results(self, client):
        _setup_user(client, "alice")
        _setup_user(client, "bob")
        resp = client.get("/stats/users")
        assert resp.status_code == 200
        users = resp.json()
        assert "alice" in users
        assert "bob" in users

    def test_empty_when_no_sessions(self, client):
        resp = client.get("/stats/users")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_sorted_alphabetically(self, client):
        _setup_user(client, "bob")
        _setup_user(client, "alice")
        users = client.get("/stats/users").json()
        assert users == sorted(users)


class TestListKeyboardLayouts:
    def test_returns_known_layouts(self, client):
        resp = client.get("/stats/keyboard-layouts")
        assert resp.status_code == 200
        layouts = resp.json()
        for layout in ("azerty", "qwerty", "bepo", "dvorak", "colemak"):
            assert layout in layouts


class TestUpdateKeyboardLayout:
    def test_updates_layout(self, client):
        _setup_user(client, "alice")
        resp = client.put(
            "/stats/user/alice/keyboard-layout",
            json={"keyboard_layout": "qwerty"},
        )
        assert resp.status_code == 200
        assert resp.json()["keyboard_layout"] == "qwerty"

    def test_invalid_layout_returns_400(self, client):
        _setup_user(client, "alice")
        resp = client.put(
            "/stats/user/alice/keyboard-layout",
            json={"keyboard_layout": "nonexistent"},
        )
        assert resp.status_code == 400

    def test_creates_preference_if_not_exists(self, client):
        _setup_user(client, "alice")
        resp = client.put(
            "/stats/user/alice/keyboard-layout",
            json={"keyboard_layout": "bepo"},
        )
        assert resp.status_code == 200


class TestDeleteUserStats:
    def test_deletes_all_user_data(self, client):
        _setup_user(client, "alice")
        resp = client.delete("/stats/user/alice")
        assert resp.status_code == 200
        assert client.get("/stats/user/alice").status_code == 404

    def test_delete_unknown_user_returns_404(self, client):
        resp = client.delete("/stats/user/nobody")
        assert resp.status_code == 404

    def test_delete_returns_counts(self, client):
        _setup_user(client, "alice")
        data = client.delete("/stats/user/alice").json()
        assert data["deleted_sessions"] >= 1
        assert data["deleted_results"] >= 1
