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

        if word_count <= len(raw_words):
            generated_words = random.sample(raw_words, word_count)
        else:
            generated_words = []
            pool = raw_words[:]
            random.shuffle(pool)

            while len(generated_words) < word_count:
                if not pool:
                    pool = raw_words[:]
                    random.shuffle(pool)

                generated_words.append(pool.pop())

        return " ".join(generated_words)

    raise ValueError(f"Unsupported exercise_type: {exercise_type}")
