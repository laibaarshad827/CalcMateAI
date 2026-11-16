from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

AngleMode = Literal["deg", "rad"]
TokenKind = Literal["num", "op", "postfix", "lparen", "rparen", "func"]

FUNC_NAMES = ("asin", "acos", "atan", "sqrt", "log10", "sin", "cos", "tan", "log", "ln", "abs")
MAX_TOKENS = 256
MAX_DEPTH = 64


class CalculationError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


@dataclass(frozen=True)
class Token:
    kind: TokenKind
    value: str | float


_OP_ALIASES: dict[str, str] = {
    "+": "+",
    "-": "-",
    "−": "-",
    "*": "*",
    "×": "*",
    "/": "/",
    "÷": "/",
    "^": "^",
}


def tokenize(source: str) -> list[Token]:
    tokens: list[Token] = []
    i = 0
    length = len(source)

    while i < length:
        if len(tokens) >= MAX_TOKENS:
            raise CalculationError("Expression is too complex.")

        ch = source[i]
        rest = source[i:]

        if ch.isspace():
            i += 1
            continue

        # Number literal (supports decimals and scientific notation like 1.5e-3)
        if ch.isdigit() or ch == ".":
            start = i
            has_dot = False
            has_digit = False
            while i < length:
                c = source[i]
                if c.isdigit():
                    has_digit = True
                    i += 1
                elif c == ".":
                    if has_dot:
                        raise CalculationError("Invalid number.")
                    has_dot = True
                    i += 1
                else:
                    break
            if not has_digit:
                raise CalculationError("Invalid number.")

            # Scientific notation e.g. 1e5 or 2.5e-4 (only if followed by digits)
            if i < length and source[i] in ("e", "E"):
                exp_idx = i + 1
                if exp_idx < length and source[exp_idx] in ("+", "-"):
                    exp_idx += 1
                if exp_idx < length and source[exp_idx].isdigit():
                    i = exp_idx
                    while i < length and source[i].isdigit():
                        i += 1

            try:
                num_val = float(source[start:i])
            except ValueError as exc:
                raise CalculationError("Invalid number.") from exc
            tokens.append(Token("num", num_val))
            continue

        # Power operator '**'
        if rest.startswith("**"):
            tokens.append(Token("op", "^"))
            i += 2
            continue

        if ch in _OP_ALIASES:
            tokens.append(Token("op", _OP_ALIASES[ch]))
            i += 1
            continue

        if ch in ("!", "%"):
            tokens.append(Token("postfix", ch))
            i += 1
            continue

        if ch == "(":
            tokens.append(Token("lparen", "("))
            i += 1
            continue

        if ch == ")":
            tokens.append(Token("rparen", ")"))
            i += 1
            continue

        if ch == "π":
            tokens.append(Token("num", math.pi))
            i += 1
            continue

        if ch == "√":
            tokens.append(Token("func", "sqrt"))
            i += 1
            continue

        matched_func = next(
            (name for name in FUNC_NAMES if rest.lower().startswith(name)),
            None,
        )
        if matched_func is not None:
            # Ensure we don't partially match an unknown identifier like 'sinx' -> wait:
            # 'sin(30)' or 'sin 30' is valid; 'sinc' is invalid.
            after_idx = i + len(matched_func)
            if after_idx < length and source[after_idx].isalpha():
                raise CalculationError(f'Unknown identifier near "{rest[:10]}".')
            tokens.append(Token("func", "log" if matched_func == "log10" else matched_func))
            i += len(matched_func)
            continue

        if rest.lower().startswith("pi"):
            after_idx = i + 2
            if after_idx < length and source[after_idx].isalpha():
                raise CalculationError(f'Unknown identifier near "{rest[:10]}".')
            tokens.append(Token("num", math.pi))
            i += 2
            continue

        if ch.lower() == "e":
            after_idx = i + 1
            if after_idx < length and source[after_idx].isalpha():
                raise CalculationError(f'Unknown identifier near "{rest[:10]}".')
            tokens.append(Token("num", math.e))
            i += 1
            continue

        raise CalculationError(f'Unexpected character "{ch}".')

    return tokens


def _factorial(n: float) -> float:
    if n < 0 or not n.is_integer():
        raise CalculationError("Factorial requires a non-negative integer.")
    int_n = int(n)
    if int_n > 170:
        raise CalculationError("Result is too large.")
    return float(math.factorial(int_n))


def _snap(n: float) -> float:
    return 0.0 if abs(n) < 1e-12 else n


def _apply_func(fn: str, x: float, angle_mode: AngleMode) -> float:
    def to_rad(v: float) -> float:
        return math.radians(v) if angle_mode == "deg" else v

    def from_rad(v: float) -> float:
        return math.degrees(v) if angle_mode == "deg" else v

    if fn == "sin":
        return _snap(math.sin(to_rad(x)))
    if fn == "cos":
        return _snap(math.cos(to_rad(x)))
    if fn == "tan":
        rad = to_rad(x)
        if abs(math.cos(rad)) < 1e-12:
            raise CalculationError("tan is undefined for this angle.")
        return _snap(math.tan(rad))
    if fn == "asin":
        if x < -1.0 or x > 1.0:
            raise CalculationError("sin⁻¹ requires a value between -1 and 1.")
        return _snap(from_rad(math.asin(x)))
    if fn == "acos":
        if x < -1.0 or x > 1.0:
            raise CalculationError("cos⁻¹ requires a value between -1 and 1.")
        return _snap(from_rad(math.acos(x)))
    if fn == "atan":
        return _snap(from_rad(math.atan(x)))
    if fn == "log":
        if x <= 0:
            raise CalculationError("log requires a positive number.")
        return math.log10(x)
    if fn == "ln":
        if x <= 0:
            raise CalculationError("ln requires a positive number.")
        return math.log(x)
    if fn == "sqrt":
        if x < 0:
            raise CalculationError("√ requires a non-negative number.")
        return math.sqrt(x)
    if fn == "abs":
        return abs(x)
    raise CalculationError(f'Unsupported function "{fn}".')


class _Parser:
    def __init__(self, tokens: list[Token], angle_mode: AngleMode) -> None:
        self.tokens = tokens
        self.angle_mode: AngleMode = angle_mode
        self.pos = 0
        self.depth = 0

    def parse(self) -> float:
        if not self.tokens:
            raise CalculationError("Enter a mathematical expression.")
        value = self._expression()
        if self.pos < len(self.tokens):
            raise CalculationError("Unexpected trailing input in expression.")
        return value

    def _peek(self) -> Token | None:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def _enter(self) -> None:
        self.depth += 1
        if self.depth > MAX_DEPTH:
            raise CalculationError("Expression nesting is too deep.")

    def _leave(self) -> None:
        self.depth -= 1

    def _expression(self) -> float:
        self._enter()
        try:
            value = self._term()
            while True:
                token = self._peek()
                if token and token.kind == "op" and token.value in ("+", "-"):
                    self.pos += 1
                    right = self._term()
                    value = value + right if token.value == "+" else value - right
                else:
                    return value
        finally:
            self._leave()

    def _term(self) -> float:
        value = self._unary()
        while True:
            token = self._peek()
            if token and token.kind == "op" and token.value in ("*", "/"):
                self.pos += 1
                right = self._unary()
                if token.value == "/":
                    if right == 0:
                        raise CalculationError("Cannot divide by zero.")
                    value /= right
                else:
                    value *= right
            elif token and token.kind in ("num", "lparen", "func"):
                # Implicit multiplication: 2pi, 2(3+4), (2)(3), 2sin(30)
                value *= self._power()
            else:
                return value

    def _unary(self) -> float:
        token = self._peek()
        if token and token.kind == "op" and token.value in ("-", "+"):
            self.pos += 1
            val = self._unary()
            return -val if token.value == "-" else val
        return self._power()

    def _power(self) -> float:
        base = self._postfix()
        token = self._peek()
        if token and token.kind == "op" and token.value == "^":
            self.pos += 1
            exponent = self._unary()
            try:
                if base < 0 and not exponent.is_integer():
                    raise CalculationError("Cannot raise a negative number to a fractional power.")
                result = math.pow(base, exponent)
            except OverflowError as exc:
                raise CalculationError("Result is too large.") from exc
            except ValueError as exc:
                raise CalculationError("Invalid exponentiation.") from exc
            if math.isnan(result):
                raise CalculationError("Invalid exponentiation.")
            return result
        return base

    def _postfix(self) -> float:
        value = self._primary()
        while True:
            token = self._peek()
            if not token or token.kind != "postfix":
                return value
            self.pos += 1
            value = _factorial(value) if token.value == "!" else value / 100.0

    def _primary(self) -> float:
        if self.pos >= len(self.tokens):
            raise CalculationError("Incomplete expression.")
        token = self.tokens[self.pos]
        self.pos += 1

        if token.kind == "num":
            return float(token.value)

        if token.kind == "lparen":
            value = self._expression()
            closing = self._peek()
            if not closing or closing.kind != "rparen":
                raise CalculationError("Missing closing parenthesis.")
            self.pos += 1
            return value

        if token.kind == "func":
            next_tok = self._peek()
            arg = self._primary() if (next_tok and next_tok.kind == "lparen") else self._power()
            return _apply_func(str(token.value), arg, self.angle_mode)

        raise CalculationError("Incomplete expression.")


def format_result(value: float) -> str:
    if value == 0:
        return "0"
    abs_val = abs(value)
    if abs_val >= 1e15 or abs_val < 1e-9:
        formatted = f"{value:.9e}"
        mantissa, exp = formatted.split("e")
        mantissa = mantissa.rstrip("0").rstrip(".")
        return f"{mantissa}×10^{int(exp)}"

    cleaned = float(f"{value:.12g}")
    if cleaned == 0:
        return "0"
    if cleaned.is_integer() and abs(cleaned) < 1e15:
        return str(int(cleaned))
    return f"{cleaned:.12g}"


def evaluate_expression(expression: str, angle_mode: AngleMode = "deg") -> tuple[float, str]:
    tokens = tokenize(expression)
    open_count = sum(1 for t in tokens if t.kind == "lparen")
    close_count = sum(1 for t in tokens if t.kind == "rparen")
    if close_count > open_count:
        raise CalculationError("Unmatched closing parenthesis.")
    if open_count > close_count:
        raise CalculationError("Missing closing parenthesis.")

    value = _Parser(tokens, angle_mode).parse()
    if math.isnan(value):
        raise CalculationError("Undefined result.")
    if math.isinf(value):
        raise CalculationError("Result is too large.")
    return value, format_result(value)
