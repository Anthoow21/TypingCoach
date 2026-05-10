import os

os.environ["DATABASE_URL"] = "sqlite:///./test_typing.db"
os.environ["ANALYSIS_SERVICE_URL"] = "http://localhost:9999"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.exercise import Exercise

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
    "key_heatmap": {"A": {"hits": 5, "errors": 1, "total_latency_ms": 600.0}},
    "latency_character_stats": {"a": {"count": 5, "total_latency_ms": 500.0}},
    "latency_sequence_stats": {"bo": {"count": 3, "total_latency_ms": 600.0}},
    "suggested_focus": ["Travailler le caractère 'a'"],
}

_TEST_DB_URL = "sqlite:///./test_typing.db"
_engine = create_engine(_TEST_DB_URL, connect_args={"check_same_thread": False})
_Session = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=_engine)
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture
def db_session(reset_db):
    db = _Session()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(reset_db):
    def override_get_db():
        db = _Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def text_exercise(db_session):
    exercise = Exercise(
        title="Exercice texte",
        exercise_type="text",
        language="fr",
        content="Bonjour le monde voici un test de frappe",
        difficulty="easy",
    )
    db_session.add(exercise)
    db_session.commit()
    db_session.refresh(exercise)
    return exercise


@pytest.fixture
def word_list_exercise(db_session):
    exercise = Exercise(
        title="Exercice liste",
        exercise_type="word_list",
        language="fr",
        content="chat|chien|maison|voiture|arbre|table|livre|école|ville|route",
        difficulty="easy",
    )
    db_session.add(exercise)
    db_session.commit()
    db_session.refresh(exercise)
    return exercise
