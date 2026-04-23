import random


def generate_reference_text(exercise_type: str, content: str, word_count: int | None = None) -> str:
    if exercise_type == "text":
        return content.strip()

    if exercise_type == "word_list":
        raw_words = [word.strip() for word in content.split("|") if word.strip()]
        if not raw_words:
            raise ValueError("word_list content must contain at least one valid word")

        if word_count is None:
            raise ValueError("word_count is required for word_list exercises")

        generated_words = [random.choice(raw_words) for _ in range(word_count)]
        return " ".join(generated_words)

    raise ValueError(f"Unsupported exercise_type: {exercise_type}")