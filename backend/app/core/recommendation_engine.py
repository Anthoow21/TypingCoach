from collections import Counter

from sqlalchemy.orm import Session

from app.core.french_word_bank import load_french_word_bank
from app.models.detailed_analysis import DetailedAnalysis
from app.models.exercise import Exercise
from app.models.result import TypingResult
from app.models.session import TypingSession
from app.schemas.recommendation import (
    RecommendationResponse,
    TargetedExerciseRecommendation,
    WeaknessSummary,
)


MIN_COMPLETED_SESSIONS = 10


def _top_labels(counter: Counter, limit: int = 3) -> list[str]:
    return [label for label, _ in counter.most_common(limit)]


def _top_distinct_sequence_labels(counter: Counter, limit: int = 3) -> list[str]:
    selected: list[str] = []

    for label, _ in counter.most_common():
        if any(label in existing or existing in label for existing in selected):
            continue
        selected.append(label)
        if len(selected) >= limit:
            break

    return selected


def _merge_latency_stats(aggregate: dict[str, dict[str, float]], payload_stats: dict) -> None:
    for key, values in (payload_stats or {}).items():
        bucket = aggregate.setdefault(key, {"count": 0, "total_latency_ms": 0.0})
        bucket["count"] += int(values.get("count", 0))
        bucket["total_latency_ms"] += float(values.get("total_latency_ms", 0.0))


def _latency_scores(payload_stats: dict[str, dict[str, float]]) -> dict[str, float]:
    scores = {}

    for key, values in payload_stats.items():
        count = int(values.get("count", 0))
        total_latency_ms = float(values.get("total_latency_ms", 0.0))
        if count <= 0:
            continue

        average_latency = total_latency_ms / count
        scores[key] = average_latency * min(count, 6)

    return scores


def _top_distinct_latency_labels(scores: dict[str, float], limit: int = 3) -> list[str]:
    selected: list[str] = []

    for label, _ in sorted(scores.items(), key=lambda item: (-item[1], -len(item[0]), item[0].casefold())):
        if any(label in existing or existing in label for existing in selected):
            continue
        selected.append(label)
        if len(selected) >= limit:
            break

    return selected


def _extract_sequences(word: str) -> set[str]:
    sequences = set()
    chars = list(word)

    for sequence_len in range(2, 5):
        if len(chars) < sequence_len:
            continue
        for start in range(0, len(chars) - sequence_len + 1):
            sequences.add("".join(chars[start:start + sequence_len]))

    return sequences


def _get_word_sequences(entry: dict) -> set[str]:
    cached = entry.get("sequences")
    if isinstance(cached, list) and cached:
        return set(cached)

    sequences = _extract_sequences(entry["word"])
    entry["sequences"] = sorted(sequences)
    return sequences


def _word_score(entry: dict, char_weights: dict[str, float], sequence_weights: dict[str, float]) -> float:
    word = entry["word"]
    chars = set(word)
    sequences = _get_word_sequences(entry)

    score = 0.0
    score += sum(weight for char, weight in char_weights.items() if char in chars)
    score += sum(weight for sequence, weight in sequence_weights.items() if sequence in sequences)

    frequency_boost = min(float(entry.get("frequency", 0.0)), 500.0) / 500.0
    length = int(entry.get("length", len(word)))
    if length <= 4:
        length_bonus = 0.2
    elif length <= 7:
        length_bonus = 0.28
    else:
        length_bonus = 0.22
    return score + frequency_boost + length_bonus


def _select_words(
    word_bank: list[dict],
    char_weights: dict[str, float],
    sequence_weights: dict[str, float],
    limit: int = 42,
) -> list[str]:
    ranked: list[tuple[float, str, int]] = []

    for entry in word_bank:
        score = _word_score(entry, char_weights, sequence_weights)
        if score <= 0:
            continue
        ranked.append((score, entry["word"], int(entry.get("length", len(entry["word"])))))

    ranked.sort(key=lambda item: (-item[0], item[1].casefold()))

    buckets = {
        "short": [],
        "medium": [],
        "long": [],
    }
    for score, word, length in ranked:
        if length <= 4:
            buckets["short"].append((score, word))
        elif length <= 7:
            buckets["medium"].append((score, word))
        else:
            buckets["long"].append((score, word))

    selected = []
    seen = set()
    bucket_order = ["short", "medium", "long"]

    while len(selected) < limit and any(buckets.values()):
        progressed = False

        for bucket_name in bucket_order:
            bucket = buckets[bucket_name]
            while bucket:
                _, word = bucket.pop(0)
                key = word.casefold()
                if key in seen:
                    continue
                selected.append(word)
                seen.add(key)
                progressed = True
                break

            if len(selected) >= limit:
                break

        if not progressed:
            break

    return selected


def _build_recommendation(
    title: str,
    rationale: str,
    focus_labels: list[str],
    char_weights: dict[str, float],
    sequence_weights: dict[str, float],
    word_bank: list[dict],
    word_count: int = 35,
) -> TargetedExerciseRecommendation | None:
    words = _select_words(word_bank, char_weights, sequence_weights)
    if len(words) < 12:
        return None

    return TargetedExerciseRecommendation(
        title=title,
        exercise_type="word_list",
        language="fr",
        content="|".join(words),
        difficulty="adaptive",
        word_count=word_count,
        focus_labels=focus_labels[:4],
        rationale=rationale,
    )


def _get_analysis_sequences(payload: dict) -> dict:
    return payload.get("weak_sequences") or payload.get("weak_bigrams") or {}


def _get_latency_sequences(payload: dict) -> dict:
    return payload.get("latency_sequence_stats") or payload.get("latency_bigram_stats") or {}


def build_user_recommendations(user_name: str, db: Session) -> RecommendationResponse:
    normalized_user_name = user_name.strip()
    if not normalized_user_name:
        raise ValueError("user_name cannot be empty")

    sessions = (
        db.query(TypingSession)
        .join(Exercise, Exercise.id == TypingSession.exercise_id)
        .filter(TypingSession.user_name == normalized_user_name)
        .filter(Exercise.difficulty != "adaptive")
        .order_by(TypingSession.started_at.desc())
        .all()
    )
    session_ids = [session.id for session in sessions]

    results = []
    analyses = []
    if session_ids:
        results = (
            db.query(TypingResult)
            .filter(TypingResult.session_id.in_(session_ids))
            .order_by(TypingResult.created_at.desc())
            .all()
        )
        analyses = (
            db.query(DetailedAnalysis)
            .filter(DetailedAnalysis.session_id.in_(session_ids))
            .all()
        )

    completed_sessions = len(results)
    sessions_remaining = max(MIN_COMPLETED_SESSIONS - completed_sessions, 0)

    char_counter = Counter()
    sequence_counter = Counter()
    latency_character_stats: dict[str, dict[str, float]] = {}
    latency_sequence_stats: dict[str, dict[str, float]] = {}

    for analysis in analyses:
        payload = analysis.analysis_payload or {}
        char_counter.update(payload.get("mistakes_by_character", {}))
        sequence_counter.update(_get_analysis_sequences(payload))
        _merge_latency_stats(latency_character_stats, payload.get("latency_character_stats", {}))
        _merge_latency_stats(latency_sequence_stats, _get_latency_sequences(payload))

    top_error_characters = _top_labels(char_counter)
    top_error_sequences = _top_distinct_sequence_labels(sequence_counter)
    slow_character_scores = _latency_scores(latency_character_stats)
    slow_sequence_scores = _latency_scores(latency_sequence_stats)
    top_slow_characters = [label for label, _ in sorted(slow_character_scores.items(), key=lambda item: item[1], reverse=True)[:3]]
    top_slow_sequences = _top_distinct_latency_labels(slow_sequence_scores)

    weakness_summary = WeaknessSummary(
        top_error_characters=top_error_characters,
        top_error_sequences=top_error_sequences,
        top_slow_characters=top_slow_characters,
        top_slow_sequences=top_slow_sequences,
    )

    if completed_sessions < MIN_COMPLETED_SESSIONS:
        return RecommendationResponse(
            user_name=normalized_user_name,
            eligible=False,
            completed_sessions=completed_sessions,
            sessions_remaining=sessions_remaining,
            message=f"Encore {sessions_remaining} session(s) pour debloquer l'entrainement cible.",
            weakness_summary=weakness_summary,
            recommendations=[],
        )

    word_bank = load_french_word_bank()
    if not word_bank:
        return RecommendationResponse(
            user_name=normalized_user_name,
            eligible=True,
            completed_sessions=completed_sessions,
            sessions_remaining=0,
            message="La banque de mots francaise n'est pas encore disponible sur le serveur.",
            weakness_summary=weakness_summary,
            recommendations=[],
        )

    precision_char_weights = {char: float(score) * 1.4 for char, score in char_counter.most_common(6)}
    precision_sequence_weights = {sequence: float(score) * 1.6 for sequence, score in sequence_counter.most_common(8)}
    fluidity_char_weights = {char: score / 120.0 for char, score in slow_character_scores.items()}
    fluidity_sequence_weights = {sequence: score / 120.0 for sequence, score in slow_sequence_scores.items()}
    mixed_char_weights = precision_char_weights | fluidity_char_weights
    mixed_sequence_weights = precision_sequence_weights | fluidity_sequence_weights

    recommendations: list[TargetedExerciseRecommendation] = []

    precision_reco = _build_recommendation(
        title="Precision - lettres et sequences fragiles",
        rationale="Travaille d'abord les erreurs les plus frequentes pour securiser la frappe.",
        focus_labels=top_error_characters + top_error_sequences,
        char_weights=precision_char_weights,
        sequence_weights=precision_sequence_weights,
        word_bank=word_bank,
    )
    if precision_reco:
        recommendations.append(precision_reco)

    fluidity_reco = _build_recommendation(
        title="Fluidite - sequences lentes",
        rationale="Cible les caracteres et suites de lettres qui ralentissent ton rythme.",
        focus_labels=top_slow_characters + top_slow_sequences,
        char_weights=fluidity_char_weights,
        sequence_weights=fluidity_sequence_weights,
        word_bank=word_bank,
    )
    if fluidity_reco:
        recommendations.append(fluidity_reco)

    mixed_reco = _build_recommendation(
        title="Mix - entrainement adapte",
        rationale="Combine precision et fluidite sur les patterns les plus sensibles.",
        focus_labels=(top_error_characters + top_error_sequences + top_slow_characters + top_slow_sequences),
        char_weights=mixed_char_weights,
        sequence_weights=mixed_sequence_weights,
        word_bank=word_bank,
    )
    if mixed_reco:
        recommendations.append(mixed_reco)

    if not recommendations:
        message = "Les donnees existent, mais aucun exercice pertinent n'a pu etre genere."
    else:
        message = "Entrainement cible disponible."

    return RecommendationResponse(
        user_name=normalized_user_name,
        eligible=True,
        completed_sessions=completed_sessions,
        sessions_remaining=0,
        message=message,
        weakness_summary=weakness_summary,
        recommendations=recommendations,
    )
