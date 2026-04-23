use axum::{extract::Json, routing::{get, post}, Router};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    service: String,
}

#[derive(Deserialize)]
struct AnalyzeRequest {
    reference_text: String,
    typed_text: String,
    duration_seconds: f64,
    error_count: i32,
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
    accuracy.clamp(0.0, 100.0).round() * 100.0 / 100.0
}

fn character_mistakes(reference_text: &str, typed_text: &str) -> HashMap<String, i32> {
    let mut counts: HashMap<String, i32> = HashMap::new();

    for (expected, actual) in reference_text.chars().zip(typed_text.chars()) {
        if expected != actual {
            let key = expected.to_string();
            *counts.entry(key).or_insert(0) += 1;
        }
    }

    if reference_text.len() > typed_text.len() {
        for ch in reference_text.chars().skip(typed_text.chars().count()) {
            let key = ch.to_string();
            *counts.entry(key).or_insert(0) += 1;
        }
    }

    counts
}

fn word_mistakes(reference_text: &str, typed_text: &str) -> HashMap<String, i32> {
    let mut counts: HashMap<String, i32> = HashMap::new();

    let expected_words: Vec<&str> = reference_text.split_whitespace().collect();
    let actual_words: Vec<&str> = typed_text.split_whitespace().collect();

    for (expected, actual) in expected_words.iter().zip(actual_words.iter()) {
        if expected != actual {
            *counts.entry((*expected).to_string()).or_insert(0) += 1;
        }
    }

    if expected_words.len() > actual_words.len() {
        for word in expected_words.iter().skip(actual_words.len()) {
            *counts.entry((*word).to_string()).or_insert(0) += 1;
        }
    }

    counts
}

fn bigram_mistakes(reference_text: &str, typed_text: &str) -> HashMap<String, i32> {
    let mut counts: HashMap<String, i32> = HashMap::new();

    let ref_chars: Vec<char> = reference_text.chars().collect();
    let typed_chars: Vec<char> = typed_text.chars().collect();
    let len = ref_chars.len().min(typed_chars.len());

    if len < 2 {
        return counts;
    }

    for i in 0..(len - 1) {
        let ref_bigram: String = [ref_chars[i], ref_chars[i + 1]].iter().collect();
        let typed_bigram: String = [typed_chars[i], typed_chars[i + 1]].iter().collect();

        if ref_bigram != typed_bigram {
            *counts.entry(ref_bigram).or_insert(0) += 1;
        }
    }

    counts
}

fn suggested_focus(
    mistakes_by_character: &HashMap<String, i32>,
    weak_words: &HashMap<String, i32>,
    weak_bigrams: &HashMap<String, i32>,
) -> Vec<String> {
    let mut suggestions = Vec::new();

    if !mistakes_by_character.is_empty() {
        suggestions.push("Travailler les caractères les plus souvent ratés".to_string());
    }
    if !weak_words.is_empty() {
        suggestions.push("Revoir les mots qui génèrent le plus d'erreurs".to_string());
    }
    if !weak_bigrams.is_empty() {
        suggestions.push("S'entraîner sur les séquences de deux lettres problématiques".to_string());
    }
    if suggestions.is_empty() {
        suggestions.push("Continuer sur des exercices similaires pour stabiliser la performance".to_string());
    }

    suggestions
}

async fn analyze(Json(payload): Json<AnalyzeRequest>) -> Json<AnalyzeResponse> {
    let mistakes_by_character = character_mistakes(&payload.reference_text, &payload.typed_text);
    let weak_words = word_mistakes(&payload.reference_text, &payload.typed_text);
    let weak_bigrams = bigram_mistakes(&payload.reference_text, &payload.typed_text);

    let response = AnalyzeResponse {
        wpm: compute_wpm(&payload.typed_text, payload.duration_seconds),
        accuracy: compute_accuracy(&payload.reference_text, payload.error_count),
        error_count: payload.error_count,
        mistakes_by_character: mistakes_by_character.clone(),
        weak_words: weak_words.clone(),
        weak_bigrams: weak_bigrams.clone(),
        suggested_focus: suggested_focus(&mistakes_by_character, &weak_words, &weak_bigrams),
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