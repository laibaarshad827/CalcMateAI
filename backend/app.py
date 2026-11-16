from __future__ import annotations

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import Config, load_config
from services.calculator_service import AngleMode, CalculationError, evaluate_expression
from services.gemini_service import GeminiServiceError, solve_question
from utils.validators import (
    ValidationError,
    require_json_body,
    validate_angle_mode,
    validate_expression,
    validate_question,
)


def create_app(config: Config | None = None) -> Flask:
    cfg = config or load_config()
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = cfg.max_content_length
    app.config["CALC_CONFIG"] = cfg

    CORS(
        app,
        resources={r"/api/*": {"origins": cfg.cors_origins}},
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
    )

    @app.get("/api/health")
    def health():
        active_cfg: Config = app.config["CALC_CONFIG"]
        return jsonify(
            {
                "status": "ok",
                "service": "calcmate-ai-backend",
                "gemini_configured": active_cfg.is_gemini_configured,
                "model": active_cfg.gemini_model,
            }
        ), 200

    @app.post("/api/calculate")
    def calculate():
        body = require_json_body(request)
        expression = validate_expression(body.get("expression"))
        angle_mode = validate_angle_mode(body.get("angle_mode"))

        try:
            _, formatted = evaluate_expression(expression, angle_mode=angle_mode)  # type: ignore[arg-type]
        except CalculationError as exc:
            return jsonify({"error": exc.message}), 400

        return jsonify(
            {
                "expression": expression,
                "angle_mode": angle_mode,
                "result": formatted,
            }
        ), 200

    @app.post("/api/ai/solve")
    def ai_solve():
        active_cfg: Config = app.config["CALC_CONFIG"]
        body = require_json_body(request)
        question = validate_question(body.get("question"))

        try:
            solution = solve_question(question, active_cfg)
        except GeminiServiceError as exc:
            return jsonify({"error": exc.message}), exc.status_code

        return jsonify(solution), 200

    @app.errorhandler(ValidationError)
    def handle_validation_error(exc: ValidationError):
        return jsonify({"error": exc.message}), exc.status_code

    @app.errorhandler(404)
    def handle_not_found(_exc):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(405)
    def handle_method_not_allowed(_exc):
        return jsonify({"error": "Method not allowed for this endpoint."}), 405

    @app.errorhandler(413)
    def handle_payload_too_large(_exc):
        return jsonify({"error": "Request payload is too large."}), 413

    @app.errorhandler(500)
    def handle_internal_error(_exc):
        return jsonify({"error": "An unexpected server error occurred."}), 500

    return app


app = create_app()

if __name__ == "__main__":
    cfg = app.config["CALC_CONFIG"]
    app.run(host=cfg.flask_host, port=cfg.flask_port, debug=cfg.flask_debug)
