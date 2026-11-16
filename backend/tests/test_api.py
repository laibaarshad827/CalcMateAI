from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from google.genai import errors as genai_errors

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import create_app  # noqa: E402
from config import Config  # noqa: E402


def make_config(api_key: str = "test-secret-key-do-not-expose", model: str = "gemini-4-hydrogen") -> Config:
    return Config(
        gemini_api_key=api_key,
        gemini_model=model,
        flask_host="127.0.0.1",
        flask_port=5000,
        flask_debug=False,
        cors_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        gemini_timeout_seconds=15.0,
    )


class TestHealthAndSecurity:
    def test_health_reports_unconfigured_without_exposing_key(self):
        app = create_app(make_config(api_key="YOUR_API_KEY_HERE"))
        client = app.test_client()
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "ok"
        assert data["gemini_configured"] is False
        assert "YOUR_API_KEY_HERE" not in res.get_data(as_text=True)

    def test_health_reports_configured_without_exposing_key(self):
        secret = "AIzaSyTestSecretValue12345"
        app = create_app(make_config(api_key=secret))
        client = app.test_client()
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "ok"
        assert data["gemini_configured"] is True
        assert secret not in res.get_data(as_text=True)

    def test_cors_allows_configured_origin_and_blocks_unknown(self):
        app = create_app(make_config())
        client = app.test_client()

        ok_res = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
        assert ok_res.headers.get("Access-Control-Allow-Origin") == "http://localhost:3000"

        blocked_res = client.get("/api/health", headers={"Origin": "https://untrusted.example.com"})
        assert blocked_res.headers.get("Access-Control-Allow-Origin") is None

    def test_payload_too_large_rejected(self):
        app = create_app(make_config())
        client = app.test_client()
        res = client.post(
            "/api/calculate",
            data=json.dumps({"expression": "1+" * 12000}),
            content_type="application/json",
        )
        assert res.status_code == 413


class TestCalculatorEndpoint:
    @pytest.fixture
    def client(self):
        return create_app(make_config()).test_client()

    @pytest.mark.parametrize(
        ("expression", "angle_mode", "expected"),
        [
            ("5 + 5", "deg", "10"),
            ("25 / 5", "deg", "5"),
            ("2 ** 3", "deg", "8"),
            ("2 ^ 3", "deg", "8"),
            ("sqrt(81)", "deg", "9"),
            ("√(81)", "deg", "9"),
            ("sin(30)", "deg", "0.5"),
            ("cos(60)", "deg", "0.5"),
            ("sin(pi/2)", "rad", "1"),
            ("log(100)", "deg", "2"),
            ("ln(e^3)", "deg", "3"),
            ("2450*15%", "deg", "367.5"),
            ("6!/(2*3)", "deg", "120"),
            ("2(3+4)", "deg", "14"),
        ],
    )
    def test_valid_calculations(self, client, expression, angle_mode, expected):
        res = client.post("/api/calculate", json={"expression": expression, "angle_mode": angle_mode})
        assert res.status_code == 200
        assert res.get_json()["result"] == expected

    def test_division_by_zero(self, client):
        res = client.post("/api/calculate", json={"expression": "10 / (5 - 5)", "angle_mode": "deg"})
        assert res.status_code == 400
        assert "zero" in res.get_json()["error"].lower()

    @pytest.mark.parametrize(
        "bad_expr",
        [
            "",
            "   ",
            "5 +",
            "(5 + 3",
            "5 + 3)",
            "__import__('os').system('echo pwned')",
            "open('/etc/passwd').read()",
            "eval('2+2')",
            "sqrt(-4)",
            "log(0)",
            "tan(90)",
        ],
    )
    def test_invalid_and_unsafe_expressions_rejected(self, client, bad_expr):
        res = client.post("/api/calculate", json={"expression": bad_expr, "angle_mode": "deg"})
        assert res.status_code == 400
        assert "error" in res.get_json()

    def test_invalid_angle_mode_rejected(self, client):
        res = client.post("/api/calculate", json={"expression": "sin(30)", "angle_mode": "grad"})
        assert res.status_code == 400


class TestAISolveEndpoint:
    def test_missing_api_key_returns_503(self):
        app = create_app(make_config(api_key="YOUR_API_KEY_HERE"))
        client = app.test_client()
        res = client.post("/api/ai/solve", json={"question": "Solve 2x + 5 = 15 step by step."})
        assert res.status_code == 503
        assert "not configured" in res.get_json()["error"].lower()

    @pytest.mark.parametrize(
        ("question", "payload", "expected_answer"),
        [
            (
                "Explain the quadratic formula.",
                {
                    "answer": "x = (-b ± √(b² - 4ac)) / (2a)",
                    "steps": [
                        {"title": "Standard form", "content": "Start with ax² + bx + c = 0 where a ≠ 0.", "expression": "ax^2 + bx + c = 0"},
                        {"title": "Complete the square", "content": "Isolate x by completing the square and taking square roots.", "expression": "x = (-b ± √(b^2 - 4ac)) / (2a)"},
                    ],
                    "explanation": "The discriminant b² - 4ac determines the number of real roots.",
                    "expression": "",
                    "is_approximate": False,
                    "is_ambiguous": False,
                },
                "x = (-b ± √(b² - 4ac)) / (2a)",
            ),
            (
                "Solve 2x + 5 = 15 step by step.",
                {
                    "answer": "5",
                    "steps": [
                        {"title": "Subtract 5", "content": "Subtract 5 from both sides.", "expression": "2x = 10"},
                        {"title": "Divide by 2", "content": "Divide both sides by 2.", "expression": "x = 5"},
                    ],
                    "explanation": "Exact solution verified.",
                    "expression": "(15 - 5) / 2",
                    "angle_mode": "deg",
                    "is_approximate": False,
                    "is_ambiguous": False,
                },
                "5",
            ),
            (
                "What is the derivative of x squared?",
                {
                    "answer": "2x",
                    "steps": [
                        {"title": "Apply power rule", "content": "Bring down the exponent 2 and reduce the power by 1.", "expression": "d/dx(x^2) = 2x^(2-1) = 2x"},
                    ],
                    "explanation": "Exact symbolic derivative using the power rule.",
                    "expression": "",
                    "is_approximate": False,
                    "is_ambiguous": False,
                },
                "2x",
            ),
        ],
    )
    def test_ai_solve_success_and_python_verification(self, question, payload, expected_answer):
        app = create_app(make_config())
        client = app.test_client()

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = SimpleNamespace(text=json.dumps(payload))

        with patch("services.gemini_service._build_client", return_value=mock_client):
            res = client.post("/api/ai/solve", json={"question": question})

        assert res.status_code == 200
        data = res.get_json()
        assert data["answer"] == expected_answer
        assert data["final_answer"] == expected_answer
        assert len(data["steps"]) >= 1
        assert data["model"] == "gemini-4-hydrogen"

    def test_python_corrects_gemini_arithmetic_slip(self):
        app = create_app(make_config())
        client = app.test_client()

        # Simulate Gemini returning a wrong number (999) for 2000 * 15%
        payload = {
            "answer": "999",
            "steps": [{"title": "Multiply", "content": "Calculate 15% of 2000.", "expression": "2000 * 15%"}],
            "explanation": "15% of 2000.",
            "expression": "2000 * 15%",
            "angle_mode": "deg",
            "is_approximate": False,
        }
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = SimpleNamespace(text=json.dumps(payload))

        with patch("services.gemini_service._build_client", return_value=mock_client):
            res = client.post("/api/ai/solve", json={"question": "What is 15% of 2000?"})

        assert res.status_code == 200
        data = res.get_json()
        assert data["verified"] is True
        assert data["final_answer"] == "300"
        assert "Independently verified" in data["explanation"]

    def test_gemini_api_failure_handled_gracefully(self):
        app = create_app(make_config())
        client = app.test_client()

        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = genai_errors.APIError(
            429, {"error": {"message": "Quota exceeded"}}
        )

        with patch("services.gemini_service._build_client", return_value=mock_client):
            res = client.post("/api/ai/solve", json={"question": "What is 2 + 2?"})

        assert res.status_code == 429
        assert "rate limit" in res.get_json()["error"].lower()

    def test_gemini_malformed_json_handled_gracefully(self):
        app = create_app(make_config())
        client = app.test_client()

        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = SimpleNamespace(text="not valid json at all")

        with patch("services.gemini_service._build_client", return_value=mock_client):
            res = client.post("/api/ai/solve", json={"question": "What is 2 + 2?"})

        assert res.status_code == 502
        assert "unreadable" in res.get_json()["error"].lower()
