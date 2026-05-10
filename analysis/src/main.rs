use axum::{
    extract::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    service: String,
}

#[derive(Debug, Deserialize, Clone)]
struct ErrorEvent {
    index: usize,
    expected_char: String,
    typed_char: String,
}

#[derive(Debug, Deserialize, Clone)]
struct KeyEvent {
    key: String,
    expected_char: Option<String>,
    position: i32,
    timestamp_ms: i64,
    event_type: String,
    is_error: bool,
    is_correction: bool,
}

#[derive(Debug, Deserialize)]
struct AnalyzeRequest {
    reference_text: String,
    typed_text: String,
    duration_seconds: f64,
    error_count: i32,
    error_events: Vec<ErrorEvent>,
    key_events: Vec<KeyEvent>,
}

#[derive(Debug, Serialize, Clone, Default)]
struct AggregateLatencyStat {
    count: i32,
    total_latency_ms: f64,
}

#[derive(Debug, Serialize, Clone, Default)]
struct HeatmapKeyStat {
    hits: i32,
    errors: i32,
    total_latency_ms: f64,
}

#[derive(Serialize)]
struct AnalyzeResponse {
    wpm: f64,
    accuracy: f64,
    error_count: i32,
    latency_mean_ms: f64,
    latency_median_ms: f64,
    latency_p95_ms: f64,
    backspace_count: i32,
    mistakes_by_character: HashMap<String, i32>,
    weak_words: HashMap<String, i32>,
    weak_sequences: HashMap<String, i32>,
    slow_characters: Vec<(String, f64)>,
    slow_sequences: Vec<(String, f64)>,
    key_heatmap: HashMap<String, HeatmapKeyStat>,
    latency_character_stats: HashMap<String, AggregateLatencyStat>,
    latency_sequence_stats: HashMap<String, AggregateLatencyStat>,
    suggested_focus: Vec<String>,
}

#[derive(Default)]
struct LatencyAnalysis {
    mean_ms: f64,
    median_ms: f64,
    p95_ms: f64,
    backspace_count: i32,
    slow_characters: Vec<(String, f64)>,
    slow_sequences: Vec<(String, f64)>,
    key_heatmap: HashMap<String, HeatmapKeyStat>,
    latency_character_stats: HashMap<String, AggregateLatencyStat>,
    latency_sequence_stats: HashMap<String, AggregateLatencyStat>,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        service: "analysis".to_string(),
    })
}

fn compute_wpm(typed_text: &str, duration_seconds: f64) -> f64 {
    if duration_seconds <= 0.0 {
        return 0.0;
    }
    let words_typed = typed_text.chars().count() as f64 / 5.0;
    let minutes = duration_seconds / 60.0;
    ((words_typed / minutes) * 100.0).round() / 100.0
}

fn compute_accuracy(reference_text: &str, error_count: i32) -> f64 {
    let reference_length = reference_text.chars().count().max(1) as f64;
    let accuracy = ((reference_length - error_count as f64) / reference_length) * 100.0;
    (accuracy.clamp(0.0, 100.0) * 100.0).round() / 100.0
}

fn chars_vec(text: &str) -> Vec<char> {
    text.chars().collect()
}

fn extract_word_at(text: &str, index: usize) -> Option<String> {
    let chars = chars_vec(text);
    if chars.is_empty() || index >= chars.len() {
        return None;
    }

    let mut start = index;
    while start > 0 && !chars[start - 1].is_whitespace() {
        start -= 1;
    }

    let mut end = index;
    while end + 1 < chars.len() && !chars[end + 1].is_whitespace() {
        end += 1;
    }

    if chars[start].is_whitespace() {
        return None;
    }

    Some(chars[start..=end].iter().collect())
}

fn extract_sequences_at(text: &str, index: usize) -> Vec<String> {
    let chars = chars_vec(text);
    if chars.len() < 2 || index >= chars.len() {
        return Vec::new();
    }

    let mut sequences = Vec::new();

    for sequence_len in 2..=4 {
        if chars.len() < sequence_len {
            continue;
        }

        let min_start = index.saturating_sub(sequence_len - 1);
        let max_start = index.min(chars.len() - sequence_len);

        for start in min_start..=max_start {
            let end = start + sequence_len;
            let window = &chars[start..end];
            if window.iter().any(|ch| ch.is_whitespace()) {
                continue;
            }

            sequences.push(window.iter().collect());
        }
    }

    sequences
}

fn mistakes_by_character(error_events: &[ErrorEvent]) -> HashMap<String, i32> {
    let mut counts = HashMap::new();

    for event in error_events {
        if event.expected_char.trim().is_empty() {
            continue;
        }
        *counts.entry(event.expected_char.clone()).or_insert(0) += 1;
    }

    counts
}

fn weak_words(reference_text: &str, error_events: &[ErrorEvent]) -> HashMap<String, i32> {
    let mut counts = HashMap::new();

    for event in error_events {
        if let Some(word) = extract_word_at(reference_text, event.index) {
            *counts.entry(word).or_insert(0) += 1;
        }
    }

    counts
}

fn weak_sequences(reference_text: &str, error_events: &[ErrorEvent]) -> HashMap<String, i32> {
    let mut counts = HashMap::new();

    for event in error_events {
        for sequence in extract_sequences_at(reference_text, event.index) {
            *counts.entry(sequence).or_insert(0) += 1;
        }
    }

    counts
}

fn top_entry(map: &HashMap<String, i32>) -> Option<(String, i32)> {
    map.iter()
        .max_by_key(|(_, count)| *count)
        .map(|(key, value)| (key.clone(), *value))
}

fn round_2(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn normalize_key_label(raw: &str) -> Option<String> {
    if raw.is_empty() {
        return None;
    }

    if raw.chars().all(|ch| ch.is_whitespace()) {
        return Some("Space".to_string());
    }

    Some(raw.to_uppercase())
}

fn display_char_label(raw: &str) -> Option<String> {
    if raw.is_empty() {
        return None;
    }

    if raw.chars().all(|ch| ch.is_whitespace()) {
        return Some("Espace".to_string());
    }

    Some(raw.to_string())
}

fn push_latency_stat(map: &mut HashMap<String, AggregateLatencyStat>, key: &str, latency_ms: f64) {
    let bucket = map.entry(key.to_string()).or_default();
    bucket.count += 1;
    bucket.total_latency_ms += latency_ms;
}

fn bump_heatmap_hit(map: &mut HashMap<String, HeatmapKeyStat>, key: &str, latency_ms: Option<f64>) {
    let bucket = map.entry(key.to_string()).or_default();
    bucket.hits += 1;
    if let Some(value) = latency_ms {
        bucket.total_latency_ms += value;
    }
}

fn bump_heatmap_error(map: &mut HashMap<String, HeatmapKeyStat>, key: &str) {
    let bucket = map.entry(key.to_string()).or_default();
    bucket.errors += 1;
}

fn compute_mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    round_2(values.iter().sum::<f64>() / values.len() as f64)
}

fn compute_median(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }

    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.total_cmp(b));

    let middle = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        round_2((sorted[middle - 1] + sorted[middle]) / 2.0)
    } else {
        round_2(sorted[middle])
    }
}

fn compute_percentile(values: &[f64], percentile: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }

    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.total_cmp(b));

    let rank = ((sorted.len() - 1) as f64 * percentile).ceil() as usize;
    round_2(sorted[rank.min(sorted.len() - 1)])
}

fn top_latency_entries(map: &HashMap<String, AggregateLatencyStat>, limit: usize) -> Vec<(String, f64)> {
    let mut entries: Vec<(String, f64)> = map
        .iter()
        .filter_map(|(key, value)| {
            if value.count <= 0 {
                return None;
            }

            Some((key.clone(), round_2(value.total_latency_ms / value.count as f64)))
        })
        .collect();

    entries.sort_by(|a, b| b.1.total_cmp(&a.1));
    entries.truncate(limit);
    entries
}

fn compute_latency_analysis(key_events: &[KeyEvent]) -> LatencyAnalysis {
    if key_events.is_empty() {
        return LatencyAnalysis::default();
    }

    let mut ordered = key_events.to_vec();
    ordered.sort_by_key(|event| event.timestamp_ms);

    let mut intervals = Vec::new();
    let mut backspace_count = 0;
    let mut key_heatmap = HashMap::new();
    let mut latency_character_stats = HashMap::new();
    let mut latency_sequence_stats = HashMap::new();

    let mut previous_timestamp: Option<i64> = None;
    let mut committed_run: Vec<String> = Vec::new();

    for event in ordered {
        let _ = event.position;
        let _ = event.is_correction;

        let latency_ms = previous_timestamp
            .map(|previous| (event.timestamp_ms - previous).max(0) as f64);
        previous_timestamp = Some(event.timestamp_ms);

        if event.event_type == "backspace" {
            backspace_count += 1;
            bump_heatmap_hit(&mut key_heatmap, "Backspace", latency_ms);
            continue;
        }

        let display_key = event
            .expected_char
            .as_deref()
            .and_then(display_char_label)
            .or_else(|| display_char_label(&event.key));
        let heatmap_key = event
            .expected_char
            .as_deref()
            .and_then(normalize_key_label)
            .or_else(|| normalize_key_label(&event.key));

        if event.is_error {
            if let Some(key) = heatmap_key {
                bump_heatmap_error(&mut key_heatmap, &key);
            }
            continue;
        }

        let Some(display_key) = display_key else {
            continue;
        };
        let Some(heatmap_key) = heatmap_key else {
            continue;
        };

        if let Some(delta) = latency_ms {
            intervals.push(delta);
            push_latency_stat(&mut latency_character_stats, &display_key, delta);
            bump_heatmap_hit(&mut key_heatmap, &heatmap_key, Some(delta));

            if display_key != "Espace" {
                committed_run.push(display_key.clone());
                if committed_run.len() > 4 {
                    committed_run.remove(0);
                }

                for sequence_len in 2..=4 {
                    if committed_run.len() < sequence_len {
                        continue;
                    }

                    let start = committed_run.len() - sequence_len;
                    let sequence = committed_run[start..].join("");
                    push_latency_stat(&mut latency_sequence_stats, &sequence, delta);
                }
            } else {
                committed_run.clear();
            }
        } else {
            bump_heatmap_hit(&mut key_heatmap, &heatmap_key, None);
            if display_key == "Espace" {
                committed_run.clear();
            } else {
                committed_run.push(display_key.clone());
                if committed_run.len() > 4 {
                    committed_run.remove(0);
                }
            }
        }
    }

    let slow_characters = top_latency_entries(&latency_character_stats, 5);
    let slow_sequences = top_latency_entries(&latency_sequence_stats, 5);

    LatencyAnalysis {
        mean_ms: compute_mean(&intervals),
        median_ms: compute_median(&intervals),
        p95_ms: compute_percentile(&intervals, 0.95),
        backspace_count,
        slow_characters,
        slow_sequences,
        key_heatmap,
        latency_character_stats,
        latency_sequence_stats,
    }
}

fn suggested_focus(
    mistakes_by_character: &HashMap<String, i32>,
    weak_words: &HashMap<String, i32>,
    weak_sequences: &HashMap<String, i32>,
    slow_characters: &[(String, f64)],
    slow_sequences: &[(String, f64)],
) -> Vec<String> {
    let mut suggestions = Vec::new();

    if let Some((ch, count)) = top_entry(mistakes_by_character) {
        suggestions.push(format!(
            "Travailler davantage le caractère '{}' ({} erreur(s))",
            ch, count
        ));
    }

    if let Some((word, count)) = top_entry(weak_words) {
        suggestions.push(format!(
            "Revoir le mot '{}' ({} erreur(s))",
            word, count
        ));
    }

    if let Some((sequence, count)) = top_entry(weak_sequences) {
        suggestions.push(format!(
            "S'entraîner sur la séquence '{}' ({} erreur(s))",
            sequence, count
        ));
    }

    if let Some((ch, latency)) = slow_characters.first() {
        suggestions.push(format!(
            "Fluidifier la touche '{}' ({:.0} ms en moyenne)",
            ch, latency
        ));
    }

    if let Some((sequence, latency)) = slow_sequences.first() {
        suggestions.push(format!(
            "Accélérer la transition '{}' ({:.0} ms en moyenne)",
            sequence, latency
        ));
    }

    if suggestions.is_empty() {
        suggestions.push(
            "Continuer sur des exercices similaires pour stabiliser la performance".to_string(),
        );
    }

    suggestions.truncate(5);
    suggestions
}

async fn analyze(Json(payload): Json<AnalyzeRequest>) -> Json<AnalyzeResponse> {
    let mistakes_by_character = mistakes_by_character(&payload.error_events);
    let weak_words = weak_words(&payload.reference_text, &payload.error_events);
    let weak_sequences = weak_sequences(&payload.reference_text, &payload.error_events);
    let latency_analysis = compute_latency_analysis(&payload.key_events);

    let response = AnalyzeResponse {
        wpm: compute_wpm(&payload.typed_text, payload.duration_seconds),
        accuracy: compute_accuracy(&payload.reference_text, payload.error_count),
        error_count: payload.error_count,
        latency_mean_ms: latency_analysis.mean_ms,
        latency_median_ms: latency_analysis.median_ms,
        latency_p95_ms: latency_analysis.p95_ms,
        backspace_count: latency_analysis.backspace_count,
        mistakes_by_character: mistakes_by_character.clone(),
        weak_words: weak_words.clone(),
        weak_sequences: weak_sequences.clone(),
        slow_characters: latency_analysis.slow_characters.clone(),
        slow_sequences: latency_analysis.slow_sequences.clone(),
        key_heatmap: latency_analysis.key_heatmap.clone(),
        latency_character_stats: latency_analysis.latency_character_stats.clone(),
        latency_sequence_stats: latency_analysis.latency_sequence_stats.clone(),
        suggested_focus: suggested_focus(
            &mistakes_by_character,
            &weak_words,
            &weak_sequences,
            &latency_analysis.slow_characters,
            &latency_analysis.slow_sequences,
        ),
    };

    Json(response)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── compute_wpm ───────────────────────────────────────────────────────────

    #[test]
    fn wpm_standard() {
        // 30 chars = 6 "words" over 60s → 6 WPM
        let wpm = compute_wpm("123456789012345678901234567890", 60.0);
        assert!((wpm - 6.0).abs() < 0.1, "wpm={wpm}");
    }

    #[test]
    fn wpm_zero_duration() {
        assert_eq!(compute_wpm("hello", 0.0), 0.0);
    }

    #[test]
    fn wpm_negative_duration() {
        assert_eq!(compute_wpm("hello", -1.0), 0.0);
    }

    #[test]
    fn wpm_empty_text() {
        assert_eq!(compute_wpm("", 60.0), 0.0);
    }

    // ── compute_accuracy ──────────────────────────────────────────────────────

    #[test]
    fn accuracy_perfect() {
        let acc = compute_accuracy("hello", 0);
        assert!((acc - 100.0).abs() < 0.01, "acc={acc}");
    }

    #[test]
    fn accuracy_all_errors() {
        let acc = compute_accuracy("hello", 5);
        assert!((acc - 0.0).abs() < 0.01, "acc={acc}");
    }

    #[test]
    fn accuracy_clamped_at_zero() {
        let acc = compute_accuracy("hi", 100);
        assert_eq!(acc, 0.0);
    }

    #[test]
    fn accuracy_partial() {
        // 10 chars, 2 errors → 80%
        let acc = compute_accuracy("1234567890", 2);
        assert!((acc - 80.0).abs() < 0.01, "acc={acc}");
    }

    #[test]
    fn accuracy_empty_reference_no_crash() {
        let acc = compute_accuracy("", 0);
        assert!((acc - 100.0).abs() < 0.01);
    }

    // ── compute_mean ──────────────────────────────────────────────────────────

    #[test]
    fn mean_empty() {
        assert_eq!(compute_mean(&[]), 0.0);
    }

    #[test]
    fn mean_single_value() {
        assert!((compute_mean(&[42.0]) - 42.0).abs() < 0.01);
    }

    #[test]
    fn mean_multiple_values() {
        assert!((compute_mean(&[10.0, 20.0, 30.0]) - 20.0).abs() < 0.01);
    }

    #[test]
    fn mean_rounded_to_two_decimals() {
        let m = compute_mean(&[1.0, 2.0, 3.0]);
        assert_eq!(m, 2.0);
    }

    // ── compute_median ────────────────────────────────────────────────────────

    #[test]
    fn median_empty() {
        assert_eq!(compute_median(&[]), 0.0);
    }

    #[test]
    fn median_odd_count() {
        assert!((compute_median(&[1.0, 3.0, 5.0]) - 3.0).abs() < 0.01);
    }

    #[test]
    fn median_even_count() {
        assert!((compute_median(&[1.0, 2.0, 3.0, 4.0]) - 2.5).abs() < 0.01);
    }

    #[test]
    fn median_unsorted_input() {
        assert!((compute_median(&[5.0, 1.0, 3.0]) - 3.0).abs() < 0.01);
    }

    #[test]
    fn median_single_value() {
        assert!((compute_median(&[7.0]) - 7.0).abs() < 0.01);
    }

    // ── compute_percentile ────────────────────────────────────────────────────

    #[test]
    fn percentile_empty() {
        assert_eq!(compute_percentile(&[], 0.95), 0.0);
    }

    #[test]
    fn percentile_single_value() {
        assert!((compute_percentile(&[42.0], 0.95) - 42.0).abs() < 0.01);
    }

    #[test]
    fn percentile_p95_takes_high_value() {
        let values: Vec<f64> = (1..=20).map(|x| x as f64).collect();
        let p95 = compute_percentile(&values, 0.95);
        assert!(p95 >= 19.0, "p95={p95}");
    }

    #[test]
    fn percentile_p50_equals_median() {
        let values = vec![10.0, 20.0, 30.0, 40.0, 50.0];
        let p50 = compute_percentile(&values, 0.5);
        let med = compute_median(&values);
        assert!((p50 - med).abs() < 0.01, "p50={p50} median={med}");
    }

    // ── extract_word_at ───────────────────────────────────────────────────────

    #[test]
    fn word_at_middle() {
        assert_eq!(extract_word_at("hello world foo", 7), Some("world".to_string()));
    }

    #[test]
    fn word_at_start() {
        assert_eq!(extract_word_at("hello world", 0), Some("hello".to_string()));
    }

    #[test]
    fn word_at_last_char_of_word() {
        assert_eq!(extract_word_at("hello world", 4), Some("hello".to_string()));
    }

    #[test]
    fn word_at_space_returns_none() {
        assert_eq!(extract_word_at("hello world", 5), None);
    }

    #[test]
    fn word_at_out_of_bounds_returns_none() {
        assert_eq!(extract_word_at("hello", 100), None);
    }

    #[test]
    fn word_at_empty_returns_none() {
        assert_eq!(extract_word_at("", 0), None);
    }

    // ── extract_sequences_at ──────────────────────────────────────────────────

    #[test]
    fn sequences_at_basic_bigrams() {
        let seqs = extract_sequences_at("abcde", 2);
        assert!(seqs.iter().any(|s| s.len() == 2), "{seqs:?}");
    }

    #[test]
    fn sequences_at_no_whitespace_crossing() {
        let seqs = extract_sequences_at("hello world", 5);
        for seq in &seqs {
            assert!(!seq.contains(' '), "whitespace in sequence: {seq}");
        }
    }

    #[test]
    fn sequences_at_empty_text() {
        assert!(extract_sequences_at("", 0).is_empty());
    }

    #[test]
    fn sequences_at_single_char_empty() {
        assert!(extract_sequences_at("a", 0).is_empty());
    }

    // ── mistakes_by_character ─────────────────────────────────────────────────

    #[test]
    fn mistakes_counts_correctly() {
        let events = vec![
            ErrorEvent { index: 0, expected_char: "a".to_string(), typed_char: "b".to_string() },
            ErrorEvent { index: 1, expected_char: "a".to_string(), typed_char: "c".to_string() },
            ErrorEvent { index: 2, expected_char: "e".to_string(), typed_char: "r".to_string() },
        ];
        let counts = mistakes_by_character(&events);
        assert_eq!(*counts.get("a").unwrap(), 2);
        assert_eq!(*counts.get("e").unwrap(), 1);
    }

    #[test]
    fn mistakes_ignores_whitespace_expected() {
        let events = vec![
            ErrorEvent { index: 0, expected_char: " ".to_string(), typed_char: "x".to_string() },
        ];
        assert!(mistakes_by_character(&events).is_empty());
    }

    #[test]
    fn mistakes_empty_events() {
        assert!(mistakes_by_character(&[]).is_empty());
    }

    // ── weak_words ────────────────────────────────────────────────────────────

    #[test]
    fn weak_words_groups_by_word() {
        let events = vec![
            ErrorEvent { index: 0, expected_char: "h".to_string(), typed_char: "j".to_string() },
            ErrorEvent { index: 1, expected_char: "e".to_string(), typed_char: "r".to_string() },
        ];
        let counts = weak_words("hello world", &events);
        assert_eq!(*counts.get("hello").unwrap(), 2);
    }

    #[test]
    fn weak_words_empty_events() {
        assert!(weak_words("hello", &[]).is_empty());
    }

    #[test]
    fn weak_words_different_words() {
        let events = vec![
            ErrorEvent { index: 0, expected_char: "h".to_string(), typed_char: "x".to_string() },
            ErrorEvent { index: 6, expected_char: "w".to_string(), typed_char: "x".to_string() },
        ];
        let counts = weak_words("hello world", &events);
        assert!(counts.contains_key("hello"));
        assert!(counts.contains_key("world"));
    }

    // ── weak_sequences ────────────────────────────────────────────────────────

    #[test]
    fn weak_sequences_generates_ngrams() {
        let events = vec![
            ErrorEvent { index: 1, expected_char: "e".to_string(), typed_char: "r".to_string() },
        ];
        let counts = weak_sequences("hello world", &events);
        assert!(!counts.is_empty(), "expected at least one sequence");
    }

    #[test]
    fn weak_sequences_empty_events() {
        assert!(weak_sequences("hello", &[]).is_empty());
    }

    // ── normalize_key_label ───────────────────────────────────────────────────

    #[test]
    fn normalize_lowercase_to_uppercase() {
        assert_eq!(normalize_key_label("a"), Some("A".to_string()));
    }

    #[test]
    fn normalize_space_to_space_label() {
        assert_eq!(normalize_key_label(" "), Some("Space".to_string()));
    }

    #[test]
    fn normalize_empty_returns_none() {
        assert_eq!(normalize_key_label(""), None);
    }

    #[test]
    fn normalize_already_uppercase() {
        assert_eq!(normalize_key_label("Z"), Some("Z".to_string()));
    }

    // ── round_2 ───────────────────────────────────────────────────────────────

    #[test]
    fn round_2_rounds_correctly() {
        assert!((round_2(3.14159) - 3.14).abs() < 0.001);
        assert!((round_2(2.555) - 2.56).abs() < 0.001);
        assert!((round_2(1.0) - 1.0).abs() < 0.001);
    }

    // ── compute_latency_analysis ──────────────────────────────────────────────

    fn make_key_event(key: &str, expected: Option<&str>, ts: i64, is_error: bool, event_type: &str) -> KeyEvent {
        KeyEvent {
            key: key.to_string(),
            expected_char: expected.map(|s| s.to_string()),
            position: 0,
            timestamp_ms: ts,
            event_type: event_type.to_string(),
            is_error,
            is_correction: false,
        }
    }

    #[test]
    fn latency_empty_events() {
        let result = compute_latency_analysis(&[]);
        assert_eq!(result.mean_ms, 0.0);
        assert_eq!(result.backspace_count, 0);
        assert!(result.key_heatmap.is_empty());
    }

    #[test]
    fn latency_counts_backspaces() {
        let events = vec![
            make_key_event("Backspace", None, 100, false, "backspace"),
            make_key_event("Backspace", None, 200, false, "backspace"),
        ];
        let result = compute_latency_analysis(&events);
        assert_eq!(result.backspace_count, 2);
    }

    #[test]
    fn latency_computes_mean_interval() {
        let events = vec![
            make_key_event("a", Some("a"), 0, false, "keydown"),
            make_key_event("b", Some("b"), 100, false, "keydown"),
            make_key_event("c", Some("c"), 300, false, "keydown"),
        ];
        let result = compute_latency_analysis(&events);
        // intervals: 100ms and 200ms → mean = 150ms
        assert!((result.mean_ms - 150.0).abs() < 0.01, "mean={}", result.mean_ms);
    }

    #[test]
    fn latency_error_events_skipped_in_intervals() {
        let events = vec![
            make_key_event("a", Some("a"), 0, false, "keydown"),
            make_key_event("x", Some("b"), 100, true, "keydown"),  // error → skipped
            make_key_event("c", Some("c"), 300, false, "keydown"),
        ];
        let result = compute_latency_analysis(&events);
        // Only two non-error events with one interval (300-100=200ms)
        assert!(result.mean_ms > 0.0);
    }

    #[test]
    fn latency_space_clears_committed_run() {
        let events = vec![
            make_key_event("a", Some("a"), 0, false, "keydown"),
            make_key_event(" ", Some(" "), 100, false, "keydown"),
            make_key_event("b", Some("b"), 200, false, "keydown"),
        ];
        // Should not panic and produce valid analysis
        let result = compute_latency_analysis(&events);
        assert!(result.mean_ms >= 0.0);
    }

    #[test]
    fn latency_builds_character_stats() {
        let events = vec![
            make_key_event("a", Some("a"), 0, false, "keydown"),
            make_key_event("b", Some("b"), 150, false, "keydown"),
        ];
        let result = compute_latency_analysis(&events);
        assert!(!result.latency_character_stats.is_empty());
    }

    // ── suggested_focus ───────────────────────────────────────────────────────

    #[test]
    fn focus_empty_inputs_returns_default() {
        let focus = suggested_focus(&HashMap::new(), &HashMap::new(), &HashMap::new(), &[], &[]);
        assert_eq!(focus.len(), 1);
        assert!(focus[0].contains("Continuer"), "{:?}", focus[0]);
    }

    #[test]
    fn focus_with_mistakes_mentions_character() {
        let mut mistakes = HashMap::new();
        mistakes.insert("a".to_string(), 3);
        let focus = suggested_focus(&mistakes, &HashMap::new(), &HashMap::new(), &[], &[]);
        assert!(focus.iter().any(|s| s.contains("'a'")), "{focus:?}");
    }

    #[test]
    fn focus_with_weak_word_mentions_word() {
        let mut words = HashMap::new();
        words.insert("bonjour".to_string(), 2);
        let focus = suggested_focus(&HashMap::new(), &words, &HashMap::new(), &[], &[]);
        assert!(focus.iter().any(|s| s.contains("bonjour")), "{focus:?}");
    }

    #[test]
    fn focus_capped_at_five_items() {
        let mut mistakes = HashMap::new();
        mistakes.insert("a".to_string(), 5);
        let mut words = HashMap::new();
        words.insert("hello".to_string(), 3);
        let mut seqs = HashMap::new();
        seqs.insert("he".to_string(), 2);
        let slow_chars = vec![("b".to_string(), 200.0)];
        let slow_seqs = vec![("bc".to_string(), 250.0)];
        let focus = suggested_focus(&mistakes, &words, &seqs, &slow_chars, &slow_seqs);
        assert!(focus.len() <= 5, "len={}", focus.len());
    }

    #[test]
    fn focus_slow_char_mentions_latency() {
        let slow_chars = vec![("z".to_string(), 300.0)];
        let focus = suggested_focus(&HashMap::new(), &HashMap::new(), &HashMap::new(), &slow_chars, &[]);
        assert!(focus.iter().any(|s| s.contains("'z'")), "{focus:?}");
    }
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/health", get(health))
        .route("/analyze", post(analyze));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}
