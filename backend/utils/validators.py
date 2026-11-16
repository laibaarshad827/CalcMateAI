from __future__ import annotations

from typing import Any

from flask import Request

MAX_EXPRESSION_LENGTH = 500
MAX_QUESTION_LENGTH = 2000


class ValidationError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def require_json_body(req: Request) -> dict[str, Any]:
    data = req.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a valid JSON object.")
    return data


def validate_expression(raw: Any) -> str:
    if not isinstance(raw, str):
        raise ValidationError("Field 'expression' must be a string.")
    expr = raw.strip()
    if not expr:
        raise ValidationError("Enter a mathematical expression.")
    if len(expr) > MAX_EXPRESSION_LENGTH:
        raise ValidationError(f"Expression exceeds maximum length of {MAX_EXPRESSION_LENGTH} characters.")
    if any(ord(ch) < 32 and ch not in ("\t", "\n", "\r") for ch in expr):
        raise ValidationError("Expression contains invalid control characters.")
    return expr


def validate_angle_mode(raw: Any) -> str:
    if raw is None:
        return "deg"
    if not isinstance(raw, str):
        raise ValidationError("Field 'angle_mode' must be 'deg' or 'rad'.")
    mode = raw.strip().lower()
    if mode not in {"deg", "rad"}:
        raise ValidationError("Field 'angle_mode' must be 'deg' or 'rad'.")
    return mode


def validate_question(raw: Any) -> str:
    if not isinstance(raw, str):
        raise ValidationError("Field 'question' must be a string.")
    question = raw.strip()
    if not question:
        raise ValidationError("Please enter a mathematical question.")
    if len(question) > MAX_QUESTION_LENGTH:
        raise ValidationError(f"Question exceeds maximum length of {MAX_QUESTION_LENGTH} characters.")
    if any(ord(ch) < 32 and ch not in ("\t", "\n", "\r") for ch in question):
        raise ValidationError("Question contains invalid control characters.")
    return question
