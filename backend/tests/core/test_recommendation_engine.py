from collections import Counter

import pytest

from app.core.recommendation_engine import (
    MIN_COMPLETED_SESSIONS,
    _build_recommendation,
    _extract_sequences,
    _get_word_sequences,
    _latency_scores,
    _merge_latency_stats,
    _select_words,
    _top_distinct_latency_labels,
    _top_distinct_sequence_labels,
    _top_labels,
    _word_score,
    build_user_recommendations,
)


class TestTopLabels:
    def test_returns_most_common(self):
        counter = Counter({"a": 5, "b": 3, "c": 1, "d": 10})
        assert _top_labels(counter, limit=2) == ["d", "a"]

    def test_respects_limit(self):
        counter = Counter({"a": 5, "b": 3, "c": 1})
        assert len(_top_labels(counter, limit=2)) == 2

    def test_empty_counter(self):
        assert _top_labels(Counter(), limit=3) == []

    def test_limit_larger_than_counter(self):
        counter = Counter({"a": 1, "b": 2})
        result = _top_labels(counter, limit=10)
        assert len(result) == 2


class TestTopDistinctSequenceLabels:
    def test_excludes_subset_sequences(self):
        counter = Counter({"ab": 10, "abc": 8, "xyz": 5})
        result = _top_distinct_sequence_labels(counter, limit=3)
        for i in range(len(result)):
            for j in range(i + 1, len(result)):
                assert result[i] not in result[j]
                assert result[j] not in result[i]

    def test_respects_limit(self):
        counter = Counter({"ab": 10, "cd": 8, "ef": 6, "gh": 4})
        result = _top_distinct_sequence_labels(counter, limit=2)
        assert len(result) <= 2

    def test_empty_counter(self):
        assert _top_distinct_sequence_labels(Counter(), limit=3) == []

    def test_no_subsets_in_result(self):
        counter = Counter({"ab": 10, "b": 8, "ba": 6})
        result = _top_distinct_sequence_labels(counter, limit=3)
        for i in range(len(result)):
            for j in range(i + 1, len(result)):
                assert result[i] not in result[j]
                assert result[j] not in result[i]


class TestMergeLatencyStats:
    def test_accumulates_count_and_latency(self):
        aggregate: dict = {}
        _merge_latency_stats(aggregate, {"a": {"count": 3, "total_latency_ms": 300.0}})
        _merge_latency_stats(aggregate, {"a": {"count": 2, "total_latency_ms": 100.0}})
        assert aggregate["a"]["count"] == 5
        assert aggregate["a"]["total_latency_ms"] == 400.0

    def test_adds_new_key(self):
        aggregate: dict = {}
        _merge_latency_stats(aggregate, {"b": {"count": 1, "total_latency_ms": 50.0}})
        assert "b" in aggregate
        assert aggregate["b"]["count"] == 1

    def test_none_payload_is_noop(self):
        aggregate: dict = {}
        _merge_latency_stats(aggregate, None)
        assert aggregate == {}

    def test_empty_payload_is_noop(self):
        aggregate: dict = {}
        _merge_latency_stats(aggregate, {})
        assert aggregate == {}

    def test_merges_multiple_keys(self):
        aggregate: dict = {}
        _merge_latency_stats(aggregate, {
            "a": {"count": 2, "total_latency_ms": 200.0},
            "b": {"count": 1, "total_latency_ms": 100.0},
        })
        assert "a" in aggregate
        assert "b" in aggregate


class TestLatencyScores:
    def test_computes_score_correctly(self):
        stats = {"a": {"count": 4, "total_latency_ms": 400.0}}
        scores = _latency_scores(stats)
        assert scores["a"] == 400.0  # avg=100, count_capped=4 → 400

    def test_caps_count_at_6(self):
        stats = {"a": {"count": 10, "total_latency_ms": 1000.0}}
        scores = _latency_scores(stats)
        assert scores["a"] == 600.0  # avg=100, count_capped=6 → 600

    def test_ignores_zero_count(self):
        stats = {"a": {"count": 0, "total_latency_ms": 0.0}}
        assert "a" not in _latency_scores(stats)

    def test_empty_stats(self):
        assert _latency_scores({}) == {}

    def test_multiple_keys(self):
        stats = {
            "a": {"count": 2, "total_latency_ms": 200.0},
            "b": {"count": 3, "total_latency_ms": 600.0},
        }
        scores = _latency_scores(stats)
        assert "a" in scores and "b" in scores


class TestTopDistinctLatencyLabels:
    def test_excludes_subset_labels(self):
        scores = {"ab": 500.0, "abc": 400.0, "xyz": 300.0}
        result = _top_distinct_latency_labels(scores, limit=3)
        for i in range(len(result)):
            for j in range(i + 1, len(result)):
                assert result[i] not in result[j]
                assert result[j] not in result[i]

    def test_respects_limit(self):
        scores = {"ab": 500.0, "cd": 400.0, "ef": 300.0, "gh": 200.0}
        result = _top_distinct_latency_labels(scores, limit=2)
        assert len(result) <= 2

    def test_empty_scores(self):
        assert _top_distinct_latency_labels({}, limit=3) == []

    def test_sorted_by_score_descending(self):
        scores = {"a": 100.0, "b": 300.0, "c": 200.0}
        result = _top_distinct_latency_labels(scores, limit=3)
        assert result[0] == "b"


class TestExtractSequences:
    def test_generates_bigrams(self):
        seqs = _extract_sequences("abc")
        assert "ab" in seqs
        assert "bc" in seqs

    def test_generates_trigrams(self):
        seqs = _extract_sequences("abcd")
        assert "abc" in seqs
        assert "bcd" in seqs

    def test_generates_quadgrams(self):
        seqs = _extract_sequences("abcde")
        assert "abcd" in seqs

    def test_short_word_only_bigram(self):
        seqs = _extract_sequences("ab")
        assert seqs == {"ab"}

    def test_single_char_empty(self):
        assert _extract_sequences("a") == set()

    def test_empty_string(self):
        assert _extract_sequences("") == set()

    def test_returns_set(self):
        assert isinstance(_extract_sequences("hello"), set)


class TestGetWordSequences:
    def test_uses_cache_if_available(self):
        entry = {"word": "chat", "sequences": ["ch", "ha", "at"]}
        seqs = _get_word_sequences(entry)
        assert "ch" in seqs

    def test_computes_and_caches(self):
        entry = {"word": "chat"}
        seqs = _get_word_sequences(entry)
        assert "ch" in seqs
        assert "sequences" in entry  # was cached


class TestWordScore:
    def test_positive_when_char_matches(self):
        entry = {"word": "chat", "frequency": 100.0, "length": 4}
        score = _word_score(entry, {"c": 1.0}, {})
        assert score > 0

    def test_higher_score_with_more_matches(self):
        entry = {"word": "chat", "frequency": 50.0, "length": 4}
        score_one = _word_score(entry, {"c": 1.0}, {})
        score_two = _word_score(entry, {"c": 1.0, "h": 0.5}, {})
        assert score_two > score_one

    def test_sequence_weight_adds_score(self):
        entry = {"word": "chat", "frequency": 0.0, "length": 4}
        score_no_seq = _word_score(entry, {}, {})
        score_with_seq = _word_score(entry, {}, {"ch": 1.0})
        assert score_with_seq > score_no_seq

    def test_length_bonus_applied(self):
        short = {"word": "ab", "frequency": 0.0, "length": 2}
        score = _word_score(short, {}, {})
        assert score == pytest.approx(0.2, abs=0.01)  # only length_bonus for short


class TestSelectWords:
    def _make_bank(self, words):
        return [{"word": w, "frequency": 50.0, "length": len(w)} for w in words]

    def test_returns_up_to_limit(self):
        bank = self._make_bank([f"word{i}abcde" for i in range(50)])
        result = _select_words(bank, {"w": 1.0}, {}, limit=10)
        assert len(result) <= 10

    def test_unique_words_case_insensitive(self):
        bank = [
            {"word": "Chat", "frequency": 100.0, "length": 4},
            {"word": "chat", "frequency": 90.0, "length": 4},
            {"word": "CHAT", "frequency": 80.0, "length": 4},
        ]
        result = _select_words(bank, {"c": 1.0}, {})
        lower = [w.lower() for w in result]
        assert len(lower) == len(set(lower))

    def test_empty_bank(self):
        assert _select_words([], {"a": 1.0}, {}) == []

    def test_balances_short_medium_long(self):
        bank = (
            self._make_bank(["ab", "cd", "ef"])
            + self._make_bank(["abcde", "bcdef", "cdefg"])
            + self._make_bank(["abcdefgh", "bcdefghi", "cdefghij"])
        )
        result = _select_words(bank, {"a": 1.0, "b": 1.0, "c": 1.0}, {}, limit=9)
        lengths = [len(w) for w in result]
        short = sum(1 for l in lengths if l <= 4)
        medium = sum(1 for l in lengths if 5 <= l <= 7)
        long_ = sum(1 for l in lengths if l > 7)
        assert short > 0 and medium > 0 and long_ > 0


class TestBuildRecommendation:
    def _make_bank(self, words):
        return [{"word": w, "frequency": 100.0, "length": len(w)} for w in words]

    def test_returns_none_when_bank_too_small(self):
        result = _build_recommendation(
            title="Test", rationale="r", focus_labels=["a"],
            char_weights={"a": 1.0}, sequence_weights={}, word_bank=[],
        )
        assert result is None

    def test_returns_recommendation_with_enough_words(self):
        bank = self._make_bank([f"chat{i}" for i in range(20)])
        result = _build_recommendation(
            title="Test", rationale="r", focus_labels=["c"],
            char_weights={"c": 1.0}, sequence_weights={}, word_bank=bank,
        )
        assert result is not None
        assert result.title == "Test"
        assert result.exercise_type == "word_list"

    def test_focus_labels_capped_at_4(self):
        bank = self._make_bank([f"chat{i}" for i in range(20)])
        result = _build_recommendation(
            title="Test", rationale="r",
            focus_labels=["a", "b", "c", "d", "e", "f"],
            char_weights={"c": 1.0}, sequence_weights={}, word_bank=bank,
        )
        assert result is not None
        assert len(result.focus_labels) <= 4


class TestBuildUserRecommendations:
    def test_raises_on_empty_username(self, db_session):
        with pytest.raises(ValueError, match="user_name cannot be empty"):
            build_user_recommendations("   ", db_session)

    def test_ineligible_when_no_sessions(self, db_session):
        result = build_user_recommendations("alice", db_session)
        assert result.eligible is False
        assert result.completed_sessions == 0
        assert result.sessions_remaining == MIN_COMPLETED_SESSIONS

    def test_ineligible_message_shows_remaining(self, db_session):
        result = build_user_recommendations("alice", db_session)
        assert str(MIN_COMPLETED_SESSIONS) in result.message

    def test_weakness_summary_always_present(self, db_session):
        result = build_user_recommendations("alice", db_session)
        assert result.weakness_summary is not None
