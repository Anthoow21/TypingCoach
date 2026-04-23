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

#[derive(Debug, Deserialize)]
struct AnalyzeRequest {
    reference_text: String,
    typed_text: String,
    duration_seconds: f64,
    error_count: i32,
    error_events: Vec<ErrorEvent>,
}

#[derive(Serialize)]
struct AnalyzeResponse {
    wpm: f64,
    accuracy: f64,
    error_count: i32,
    mistakes_by_character: HashMap<String, i32>,
    weak_words: HashMap<String, i32>,
    weak_bigrams: HashMap<String, i32>,
    suggested_focus: Vec<String>,
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

fn extract_bigram_at(text: &str, index: usize) -> Option<String> {
    let chars = chars_vec(text);
    if chars.len() < 2 || index >= chars.len() {
        return None;
    }

    if index + 1 < chars.len() && !chars[index].is_whitespace() && !chars[index + 1].is_whitespace() {
        return Some(chars[index..=index + 1].iter().collect());
    }

    if index > 0 && !chars[index - 1].is_whitespace() && !chars[index].is_whitespace() {
        return Some(chars[index - 1..=index].iter().collect());
    }

    None
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

fn weak_bigrams(reference_text: &str, error_events: &[ErrorEvent]) -> HashMap<String, i32> {
    let mut counts = HashMap::new();

    for event in error_events {
        if let Some(bigram) = extract_bigram_at(reference_text, event.index) {
            *counts.entry(bigram).or_insert(0) += 1;
        }
    }

    counts
}

fn top_entry(map: &HashMap<String, i32>) -> Option<(String, i32)> {
    map.iter()
        .max_by_key(|(_, count)| *count)
        .map(|(key, value)| (key.clone(), *value))
}

fn suggested_focus(
    mistakes_by_character: &HashMap<String, i32>,
    weak_words: &HashMap<String, i32>,
    weak_bigrams: &HashMap<String, i32>,
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

    if let Some((bigram, count)) = top_entry(weak_bigrams) {
        suggestions.push(format!(
            "S'entraîner sur la séquence '{}' ({} erreur(s))",
            bigram, count
        ));
    }

    if suggestions.is_empty() {
        suggestions.push(
            "Continuer sur des exercices similaires pour stabiliser la performance".to_string(),
        );
    }

    suggestions
}

async fn analyze(Json(payload): Json<AnalyzeRequest>) -> Json<AnalyzeResponse> {
    let mistakes_by_character = mistakes_by_character(&payload.error_events);
    let weak_words = weak_words(&payload.reference_text, &payload.error_events);
    let weak_bigrams = weak_bigrams(&payload.reference_text, &payload.error_events);

    let response = AnalyzeResponse {
        wpm: compute_wpm(&payload.typed_text, payload.duration_seconds),
        accuracy: compute_accuracy(&payload.reference_text, payload.error_count),
        error_count: payload.error_count,
        mistakes_by_character: mistakes_by_character.clone(),
        weak_words: weak_words.clone(),
        weak_bigrams: weak_bigrams.clone(),
        suggested_focus: suggested_focus(
            &mistakes_by_character,
            &weak_words,
            &weak_bigrams,
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