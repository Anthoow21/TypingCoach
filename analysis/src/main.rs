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

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/health", get(health))
        .route("/analyze", post(analyze));

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}
