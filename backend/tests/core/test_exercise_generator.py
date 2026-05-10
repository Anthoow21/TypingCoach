import pytest

from app.core.exercise_generator import generate_reference_text


class TestTextExercise:
    def test_returns_stripped_content(self):
        result = generate_reference_text("text", "  Hello world  ")
        assert result == "Hello world"

    def test_ignores_word_count(self):
        result = generate_reference_text("text", "Hello world", word_count=5)
        assert result == "Hello world"

    def test_empty_content_returns_empty(self):
        result = generate_reference_text("text", "   ")
        assert result == ""


class TestWordListExercise:
    def test_exact_count_below_pool(self):
        content = "chat|chien|maison|voiture|arbre"
        result = generate_reference_text("word_list", content, word_count=3)
        words = result.split()
        assert len(words) == 3

    def test_words_come_from_pool(self):
        pool = {"chat", "chien", "maison", "voiture", "arbre"}
        result = generate_reference_text("word_list", "|".join(pool), word_count=3)
        assert all(w in pool for w in result.split())

    def test_no_duplicates_when_count_lte_pool(self):
        content = "chat|chien|maison|voiture|arbre"
        result = generate_reference_text("word_list", content, word_count=5)
        words = result.split()
        assert len(words) == 5
        assert len(set(words)) == 5

    def test_more_than_pool_size(self):
        content = "chat|chien|maison"
        result = generate_reference_text("word_list", content, word_count=7)
        words = result.split()
        assert len(words) == 7
        assert all(w in {"chat", "chien", "maison"} for w in words)

    def test_missing_word_count_raises(self):
        with pytest.raises(ValueError, match="word_count is required"):
            generate_reference_text("word_list", "chat|chien|maison")

    def test_empty_content_raises(self):
        with pytest.raises(ValueError, match="at least one valid word"):
            generate_reference_text("word_list", "|||", word_count=5)

    def test_whitespace_only_words_ignored(self):
        with pytest.raises(ValueError, match="at least one valid word"):
            generate_reference_text("word_list", "  |  |  ", word_count=3)

    def test_result_is_space_separated(self):
        content = "chat|chien|maison|voiture"
        result = generate_reference_text("word_list", content, word_count=3)
        assert len(result.split()) == 3

    def test_single_word_pool_repeated(self):
        result = generate_reference_text("word_list", "seul", word_count=4)
        words = result.split()
        assert len(words) == 4
        assert all(w == "seul" for w in words)


class TestInvalidType:
    def test_unknown_type_raises(self):
        with pytest.raises(ValueError, match="Unsupported exercise_type"):
            generate_reference_text("unknown", "content", word_count=10)

    def test_empty_type_raises(self):
        with pytest.raises(ValueError, match="Unsupported exercise_type"):
            generate_reference_text("", "content", word_count=10)
