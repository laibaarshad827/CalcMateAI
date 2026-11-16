from __future__ import annotations

import json
import math
import re
from typing import Any, Literal

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from pydantic import BaseModel, Field

from config import Config
from services.calculator_service import AngleMode, CalculationError, evaluate_expression


class GeminiStep(BaseModel):
    title: str = Field(default="")
    content: str
    expression: str = Field(default="")


class GeminiMathSchema(BaseModel):
    answer: str
    steps: list[GeminiStep] = Field(default_factory=list)
    explanation: str = Field(default="")
    expression: str = Field(default="")
    angle_mode: Literal["deg", "rad"] = Field(default="deg")
    is_approximate: bool = Field(default=False)
    is_ambiguous: bool = Field(default=False)


class GeminiServiceError(Exception):
    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


SYSTEM_INSTRUCTION = """You are CalcMate AI, a precise and helpful mathematics assistant.

Your job is to solve mathematical questions, equations, word problems, calculus, algebra,
and explain mathematical concepts clearly in plain language.

Rules:
1. Provide clear, logical step-by-step reasoning in `steps`, explaining WHY each step is performed.
2. Format mathematical expressions cleanly (e.g. `2x + 5 = 15`, `x = (-b ± √(b² - 4ac)) / (2a)`).
3. If a question is ambiguous or missing information, set `is_ambiguous` to true, clearly explain the ambiguity, and state any assumption used.
4. Distinguish exact answers from decimal approximations. If the answer is rounded or irrational as a decimal, set `is_approximate` to true and show both exact form and decimal approximation when helpful.
5. Never invent numerical results. When the final result comes from a pure numerical computation (e.g., `2000 * 15%`, `10000 * (1 + 0.05)^3`, `sqrt(81)`), put that evaluable expression in `expression` using only numbers, `+ - * / ^ % !`, parentheses, `pi`, `e`, `sqrt`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `log` (base 10), `ln`. Otherwise leave `expression` as an empty string `""`.
6. Return ONLY valid JSON matching the requested schema."""


_NUMBER_ONLY_RE = re.compile(r"^[≈~]?\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*$")
_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


def _strip_code_fences(raw: str) -> str:
    return _FENCE_RE.sub("", raw.strip()).strip()


def _parse_response_payload(raw_text: str) -> dict[str, Any]:
    cleaned = _strip_code_fences(raw_text)
    if not cleaned:
        raise GeminiServiceError("Gemini returned an empty response. Please try again.", status_code=502)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end > start:
            try:
                parsed = json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError as exc:
                raise GeminiServiceError(
                    "The AI model returned an unreadable response format. Please try again.",
                    status_code=502,
                ) from exc
        else:
            raise GeminiServiceError(
                "The AI model returned an unreadable response format. Please try again.",
                status_code=502,
            )

    if not isinstance(parsed, dict):
        raise GeminiServiceError("The AI model returned an unexpected response structure.", status_code=502)
    return parsed


def _normalize_steps(raw_steps: Any) -> list[dict[str, str]]:
    if not isinstance(raw_steps, list):
        return []
    normalized: list[dict[str, str]] = []
    for item in raw_steps:
        if isinstance(item, str):
            text = item.strip()
            if text:
                normalized.append({"content": text})
        elif isinstance(item, dict):
            title = str(item.get("title") or "").strip()
            content = str(item.get("content") or item.get("explanation") or "").strip()
            expression = str(item.get("expression") or "").strip()
            if title or content or expression:
                step: dict[str, str] = {"content": content or title}
                if title and content:
                    step["title"] = title
                if expression:
                    step["expression"] = expression
                normalized.append(step)
    return normalized


def _verify_numeric_expression(
    expression: str,
    angle_mode: AngleMode,
    ai_answer: str,
    is_approximate: bool,
) -> tuple[str, bool, str | None, bool, str | None]:
    expr = expression.strip()
    if not expr:
        return ai_answer, False, None, is_approximate, None

    try:
        py_val, py_formatted = evaluate_expression(expr, angle_mode)
    except CalculationError:
        return ai_answer, False, None, is_approximate, None

    note: str | None = None
    final_answer = ai_answer
    exact_flag = is_approximate

    match = _NUMBER_ONLY_RE.match(ai_answer.strip())
    if match:
        try:
            ai_num = float(match.group(1))
            tolerance = 1e-6 * max(1.0, abs(py_val))
            if not math.isclose(ai_num, py_val, abs_tol=tolerance):
                final_answer = py_formatted
                note = f"Independently verified by Python calculator: {expr} = {py_formatted}."
        except ValueError:
            pass

    if not exact_flag and "." in py_formatted and len(py_formatted.split(".")[1]) >= 8:
        exact_flag = True

    return final_answer, True, py_formatted, exact_flag, note


def _build_client(config: Config) -> genai.Client:
    timeout_ms = max(5_000, int(config.gemini_timeout_seconds * 1000))
    return genai.Client(
        api_key=config.gemini_api_key,
        http_options=types.HttpOptions(
            headers={"User-Agent": "aistudio-build"},
            timeout=timeout_ms,
        ),
    )


def _map_api_error(exc: genai_errors.APIError, model: str) -> GeminiServiceError:
    code = getattr(exc, "code", None)
    message = str(getattr(exc, "message", "") or "").lower()

    if code in (401, 403) or "api key" in message or "permission" in message or "unauthenticated" in message:
        return GeminiServiceError(
            "Invalid or unauthorized Gemini API key. Verify GEMINI_API_KEY in backend/.env.",
            status_code=401,
        )
    if code == 429 or "quota" in message or "rate" in message or "resource_exhausted" in message:
        return GeminiServiceError(
            "Gemini API rate limit or quota reached. Please wait a moment and try again.",
            status_code=429,
        )
    if code == 404 or "not found" in message:
        return GeminiServiceError(
            f'Configured Gemini model "{model}" is unavailable. Check GEMINI_MODEL in backend/.env.',
            status_code=503,
        )
    if code in (408, 504) or "timeout" in message or "deadline" in message:
        return GeminiServiceError("Gemini API timed out while solving the problem. Please retry.", status_code=504)
    if code and code >= 500:
        return GeminiServiceError("Gemini service is temporarily unavailable. Please try again shortly.", status_code=503)
    return GeminiServiceError("Gemini could not process this request. Please try rephrasing.", status_code=502)


def solve_question(question: str, config: Config, client: genai.Client | None = None) -> dict[str, Any]:
    if not config.is_gemini_configured:
        raise GeminiServiceError(
            "Gemini API key is not configured. Set GEMINI_API_KEY in backend/.env and restart Flask.",
            status_code=503,
        )

    active_client = client or _build_client(config)

    try:
        response = active_client.models.generate_content(
            model=config.gemini_model,
            contents=question,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=GeminiMathSchema,
            ),
        )
    except genai_errors.APIError as exc:
        raise _map_api_error(exc, config.gemini_model) from exc
    except TimeoutError as exc:
        raise GeminiServiceError("Gemini API timed out. Please try again.", status_code=504) from exc
    except Exception as exc:
        exc_name = type(exc).__name__.lower()
        if "timeout" in exc_name:
            raise GeminiServiceError("Gemini API timed out. Please try again.", status_code=504) from exc
        if "connect" in exc_name or "network" in exc_name:
            raise GeminiServiceError(
                "Network error while contacting Gemini API. Check your internet connection.",
                status_code=502,
            ) from exc
        raise GeminiServiceError("Failed to get a response from Gemini API.", status_code=502) from exc

    raw_text = getattr(response, "text", None) or ""
    data = _parse_response_payload(raw_text)

    answer = str(data.get("answer") or data.get("final_answer") or "").strip()
    if not answer:
        raise GeminiServiceError("Gemini did not provide a final answer. Please try again.", status_code=502)

    steps = _normalize_steps(data.get("steps"))
    explanation = str(data.get("explanation") or "").strip()
    expression = str(data.get("expression") or "").strip()
    angle_mode: AngleMode = "rad" if str(data.get("angle_mode") or "").lower() == "rad" else "deg"
    is_approximate = bool(data.get("is_approximate", False))
    is_ambiguous = bool(data.get("is_ambiguous", False))

    final_answer, verified, verified_value, is_approximate, verification_note = _verify_numeric_expression(
        expression=expression,
        angle_mode=angle_mode,
        ai_answer=answer,
        is_approximate=is_approximate,
    )

    if verification_note:
        explanation = f"{explanation} {verification_note}".strip() if explanation else verification_note

    return {
        "question": question,
        "answer": final_answer,
        "final_answer": final_answer,
        "steps": steps,
        "explanation": explanation,
        "expression": expression,
        "verified": verified,
        "verified_value": verified_value,
        "is_approximate": is_approximate,
        "is_ambiguous": is_ambiguous,
        "model": config.gemini_model,
    }
