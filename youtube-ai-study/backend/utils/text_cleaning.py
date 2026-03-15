import re
from typing import List


FILLER_WORDS = [
    "um",
    "uh",
    "you know",
    "like",
    "i mean",
    "sort of",
    "kind of",
    "okay",
    "so yeah",
]


def remove_square_bracket_noise(text: str) -> str:
    """
    Remove segments such as [Music], [Applause], [Laughter] from the transcript.
    """
    return re.sub(r"\[[^\]]*\]", " ", text)


def remove_filler_words(text: str) -> str:
    """
    Remove common filler words that do not add learning value.
    """
    pattern = r"\b(" + "|".join(map(re.escape, FILLER_WORDS)) + r")\b"
    cleaned = re.sub(pattern, " ", text, flags=re.IGNORECASE)
    # Collapse repeated spaces after removal
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned.strip()


def normalise_whitespace(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_transcript_lines(lines: List[str]) -> List[str]:
    """
    Apply cleaning to a list of transcript lines.
    """
    cleaned: List[str] = []
    for line in lines:
        line = remove_square_bracket_noise(line)
        line = remove_filler_words(line)
        line = normalise_whitespace(line)
        if line:
            cleaned.append(line)
    return cleaned


def clean_transcript_text(text: str) -> str:
    """
    Convenience helper when transcript is already a single text blob.
    """
    text = remove_square_bracket_noise(text)
    text = remove_filler_words(text)
    text = normalise_whitespace(text)
    return text

