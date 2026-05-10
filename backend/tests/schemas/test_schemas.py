import pytest
from pydantic import ValidationError

from app.schemas.exercise import ExerciseCreate
from app.schemas.practice_series import PracticeSeriesCreate
from app.schemas.session import SessionCreate


class TestSessionCreate:
    def test_valid(self):
        s = SessionCreate(exercise_id=1, user_name="alice")
        assert s.user_name == "alice"
        assert s.exercise_id == 1

    def test_user_name_stripped(self):
        s = SessionCreate(exercise_id=1, user_name="  alice  ")
        assert s.user_name == "alice"

    def test_empty_user_name_raises(self):
        with pytest.raises(ValidationError):
            SessionCreate(exercise_id=1, user_name="")

    def test_whitespace_user_name_raises(self):
        with pytest.raises(ValidationError):
            SessionCreate(exercise_id=1, user_name="   ")

    def test_word_count_none_allowed(self):
        s = SessionCreate(exercise_id=1, user_name="alice")
        assert s.word_count is None

    def test_word_count_min_boundary(self):
        s = SessionCreate(exercise_id=1, user_name="alice", word_count=25)
        assert s.word_count == 25

    def test_word_count_max_boundary(self):
        s = SessionCreate(exercise_id=1, user_name="alice", word_count=100)
        assert s.word_count == 100

    def test_word_count_below_min_raises(self):
        with pytest.raises(ValidationError):
            SessionCreate(exercise_id=1, user_name="alice", word_count=24)

    def test_word_count_above_max_raises(self):
        with pytest.raises(ValidationError):
            SessionCreate(exercise_id=1, user_name="alice", word_count=101)

    def test_word_count_zero_raises(self):
        with pytest.raises(ValidationError):
            SessionCreate(exercise_id=1, user_name="alice", word_count=0)


class TestExerciseCreate:
    def test_valid_text_exercise(self):
        e = ExerciseCreate(
            title="Test", exercise_type="text", language="fr", content="Bonjour"
        )
        assert e.exercise_type == "text"

    def test_valid_word_list_exercise(self):
        e = ExerciseCreate(
            title="Test", exercise_type="word_list", language="fr", content="chat|chien"
        )
        assert e.exercise_type == "word_list"

    def test_title_stripped(self):
        e = ExerciseCreate(
            title="  Test  ", exercise_type="text", language="fr", content="Hello"
        )
        assert e.title == "Test"

    def test_content_stripped(self):
        e = ExerciseCreate(
            title="Test", exercise_type="text", language="fr", content="  Hello  "
        )
        assert e.content == "Hello"

    def test_empty_title_raises(self):
        with pytest.raises(ValidationError):
            ExerciseCreate(title="", exercise_type="text", language="fr", content="Hello")

    def test_whitespace_title_raises(self):
        with pytest.raises(ValidationError):
            ExerciseCreate(title="   ", exercise_type="text", language="fr", content="Hello")

    def test_invalid_exercise_type_raises(self):
        with pytest.raises(ValidationError):
            ExerciseCreate(
                title="Test", exercise_type="paragraph", language="fr", content="Hello"
            )

    def test_empty_content_raises(self):
        with pytest.raises(ValidationError):
            ExerciseCreate(title="Test", exercise_type="text", language="fr", content="")

    def test_whitespace_content_raises(self):
        with pytest.raises(ValidationError):
            ExerciseCreate(title="Test", exercise_type="text", language="fr", content="   ")

    def test_default_difficulty(self):
        e = ExerciseCreate(
            title="Test", exercise_type="text", language="fr", content="Hello"
        )
        assert e.difficulty == "easy"


class TestPracticeSeriesCreate:
    def test_valid_series(self):
        s = PracticeSeriesCreate(user_name="alice", number_of_exercises=5)
        assert s.number_of_exercises == 5

    def test_user_name_stripped(self):
        s = PracticeSeriesCreate(user_name="  alice  ", number_of_exercises=3)
        assert s.user_name == "alice"

    def test_empty_user_name_raises(self):
        with pytest.raises(ValidationError):
            PracticeSeriesCreate(user_name="", number_of_exercises=5)

    def test_whitespace_user_name_raises(self):
        with pytest.raises(ValidationError):
            PracticeSeriesCreate(user_name="   ", number_of_exercises=5)

    def test_number_min_boundary(self):
        s = PracticeSeriesCreate(user_name="alice", number_of_exercises=1)
        assert s.number_of_exercises == 1

    def test_number_max_boundary(self):
        s = PracticeSeriesCreate(user_name="alice", number_of_exercises=20)
        assert s.number_of_exercises == 20

    def test_number_below_min_raises(self):
        with pytest.raises(ValidationError):
            PracticeSeriesCreate(user_name="alice", number_of_exercises=0)

    def test_number_above_max_raises(self):
        with pytest.raises(ValidationError):
            PracticeSeriesCreate(user_name="alice", number_of_exercises=21)

    def test_invalid_exercise_mode_raises(self):
        with pytest.raises(ValidationError):
            PracticeSeriesCreate(
                user_name="alice",
                number_of_exercises=5,
                exercise_modes=["invalid_mode"],
            )

    def test_empty_exercise_modes_raises(self):
        with pytest.raises(ValidationError):
            PracticeSeriesCreate(
                user_name="alice", number_of_exercises=5, exercise_modes=[]
            )

    def test_invalid_word_count_raises(self):
        with pytest.raises(ValidationError):
            PracticeSeriesCreate(
                user_name="alice",
                number_of_exercises=5,
                allowed_word_counts=[30],
            )

    def test_default_exercise_modes(self):
        s = PracticeSeriesCreate(user_name="alice", number_of_exercises=3)
        assert "text" in s.exercise_modes or "word_list" in s.exercise_modes

    def test_both_exercise_modes_valid(self):
        s = PracticeSeriesCreate(
            user_name="alice",
            number_of_exercises=3,
            exercise_modes=["text", "word_list"],
        )
        assert set(s.exercise_modes) == {"text", "word_list"}
