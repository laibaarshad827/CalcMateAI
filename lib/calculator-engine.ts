import type { AngleMode } from './types'

export class CalcError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CalcError'
  }
}

type Func = 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan' | 'log' | 'ln' | 'sqrt'
type Op = '+' | '-' | '*' | '/' | '^'

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: Op }
  | { kind: 'postfix'; value: '!' | '%' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'func'; value: Func }

const FUNC_NAMES: Func[] = ['asin', 'acos', 'atan', 'sqrt', 'sin', 'cos', 'tan', 'log', 'ln']

const OP_ALIASES: Record<string, Op> = {
  '+': '+',
  '-': '-',
  '−': '-',
  '*': '*',
  '×': '*',
  '/': '/',
  '÷': '/',
  '^': '^',
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    const rest = source.slice(i)

    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/[0-9.]/.test(ch)) {
      const match = /^(\d+\.?\d*|\.\d+)/.exec(rest)
      if (!match || source[i + match[0].length] === '.') throw new CalcError('Invalid number')
      tokens.push({ kind: 'num', value: parseFloat(match[0]) })
      i += match[0].length
      continue
    }
    if (ch in OP_ALIASES) {
      tokens.push({ kind: 'op', value: OP_ALIASES[ch] })
      i++
      continue
    }
    if (ch === '!' || ch === '%') {
      tokens.push({ kind: 'postfix', value: ch })
      i++
      continue
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' })
      i++
      continue
    }
    if (ch === 'π') {
      tokens.push({ kind: 'num', value: Math.PI })
      i++
      continue
    }
    if (ch === '√') {
      tokens.push({ kind: 'func', value: 'sqrt' })
      i++
      continue
    }
    const fn = FUNC_NAMES.find((name) => rest.startsWith(name))
    if (fn) {
      tokens.push({ kind: 'func', value: fn })
      i += fn.length
      continue
    }
    if (rest.startsWith('pi')) {
      tokens.push({ kind: 'num', value: Math.PI })
      i += 2
      continue
    }
    if (ch === 'e') {
      tokens.push({ kind: 'num', value: Math.E })
      i++
      continue
    }
    throw new CalcError(`Unexpected "${ch}"`)
  }
  return tokens
}

function factorial(n: number) {
  if (n < 0 || !Number.isInteger(n)) throw new CalcError('Factorial needs a non-negative integer')
  if (n > 170) throw new CalcError('Result is too large')
  let result = 1
  for (let k = 2; k <= n; k++) result *= k
  return result
}

const snap = (n: number) => (Math.abs(n) < 1e-12 ? 0 : n)

function applyFunc(fn: Func, x: number, angle: AngleMode): number {
  const toRad = (v: number) => (angle === 'deg' ? (v * Math.PI) / 180 : v)
  const fromRad = (v: number) => (angle === 'deg' ? (v * 180) / Math.PI : v)

  switch (fn) {
    case 'sin':
      return snap(Math.sin(toRad(x)))
    case 'cos':
      return snap(Math.cos(toRad(x)))
    case 'tan': {
      if (Math.abs(Math.cos(toRad(x))) < 1e-12) throw new CalcError('tan is undefined here')
      return snap(Math.tan(toRad(x)))
    }
    case 'asin':
    case 'acos':
      if (x < -1 || x > 1) throw new CalcError(`${fn === 'asin' ? 'sin⁻¹' : 'cos⁻¹'} needs a value between −1 and 1`)
      return fromRad(fn === 'asin' ? Math.asin(x) : Math.acos(x))
    case 'atan':
      return fromRad(Math.atan(x))
    case 'log':
      if (x <= 0) throw new CalcError('log needs a positive number')
      return Math.log10(x)
    case 'ln':
      if (x <= 0) throw new CalcError('ln needs a positive number')
      return Math.log(x)
    case 'sqrt':
      if (x < 0) throw new CalcError('√ needs a non-negative number')
      return Math.sqrt(x)
  }
}

class Parser {
  private pos = 0

  constructor(
    private tokens: Token[],
    private angle: AngleMode,
  ) {}

  parse() {
    if (this.tokens.length === 0) throw new CalcError('Enter an expression')
    const value = this.expression()
    if (this.pos < this.tokens.length) throw new CalcError('Unexpected input')
    return value
  }

  private peek() {
    return this.tokens[this.pos]
  }

  private expression(): number {
    let value = this.term()
    for (;;) {
      const token = this.peek()
      if (token?.kind === 'op' && (token.value === '+' || token.value === '-')) {
        this.pos++
        const right = this.term()
        value = token.value === '+' ? value + right : value - right
      } else {
        return value
      }
    }
  }

  private term(): number {
    let value = this.unary()
    for (;;) {
      const token = this.peek()
      if (token?.kind === 'op' && (token.value === '*' || token.value === '/')) {
        this.pos++
        const right = this.unary()
        if (token.value === '/') {
          if (right === 0) throw new CalcError('Cannot divide by zero')
          value /= right
        } else {
          value *= right
        }
      } else if (token && (token.kind === 'num' || token.kind === 'lparen' || token.kind === 'func')) {
        value *= this.power()
      } else {
        return value
      }
    }
  }

  private unary(): number {
    const token = this.peek()
    if (token?.kind === 'op' && (token.value === '-' || token.value === '+')) {
      this.pos++
      const value = this.unary()
      return token.value === '-' ? -value : value
    }
    return this.power()
  }

  private power(): number {
    const base = this.postfix()
    const token = this.peek()
    if (token?.kind === 'op' && token.value === '^') {
      this.pos++
      const result = Math.pow(base, this.unary())
      if (Number.isNaN(result)) throw new CalcError('Invalid power')
      return result
    }
    return base
  }

  private postfix(): number {
    let value = this.primary()
    for (;;) {
      const token = this.peek()
      if (token?.kind !== 'postfix') return value
      this.pos++
      value = token.value === '!' ? factorial(value) : value / 100
    }
  }

  private primary(): number {
    const token = this.tokens[this.pos++]
    if (!token) throw new CalcError('Incomplete expression')
    switch (token.kind) {
      case 'num':
        return token.value
      case 'lparen': {
        const value = this.expression()
        if (this.tokens[this.pos++]?.kind !== 'rparen') throw new CalcError('Missing closing parenthesis')
        return value
      }
      case 'func': {
        const arg = this.peek()?.kind === 'lparen' ? this.primary() : this.power()
        return applyFunc(token.value, arg, this.angle)
      }
      default:
        throw new CalcError('Incomplete expression')
    }
  }
}

export function evaluateExpression(expression: string, angle: AngleMode): number {
  const tokens = tokenize(expression)
  const open = tokens.filter((t) => t.kind === 'lparen').length
  const close = tokens.filter((t) => t.kind === 'rparen').length
  if (close > open) throw new CalcError('Unmatched closing parenthesis')
  for (let k = 0; k < open - close; k++) tokens.push({ kind: 'rparen' })

  const value = new Parser(tokens, angle).parse()
  if (Number.isNaN(value)) throw new CalcError('Undefined result')
  if (!Number.isFinite(value)) throw new CalcError('Result is too large')
  return value
}

/** Formats a number so it can be displayed and also typed back into an expression. */
export function formatResult(value: number): string {
  const n = Object.is(value, -0) ? 0 : value
  const abs = Math.abs(n)
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
    const [mantissa, exponent] = n.toExponential(9).split('e')
    const trimmed = mantissa.replace(/\.?0+$/, '')
    return `${trimmed}×10^${Number(exponent)}`
  }
  return String(parseFloat(n.toPrecision(13)))
}

export function tryPreview(expression: string, angle: AngleMode): string | null {
  if (!expression.trim()) return null
  try {
    return formatResult(evaluateExpression(expression, angle))
  } catch {
    return null
  }
}

/** Converts the internal expression into a readable form for the display. */
export function toDisplay(expression: string) {
  return expression
    .replace(/asin\(/g, 'sin⁻¹(')
    .replace(/acos\(/g, 'cos⁻¹(')
    .replace(/atan\(/g, 'tan⁻¹(')
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .replace(/-/g, '−')
}

/** Converts the internal expression into plain ASCII for the Flask backend. */
export function toBackendExpression(expression: string) {
  return expression
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
}

const MULTI_CHAR_TOKENS = ['×10^', 'asin(', 'acos(', 'atan(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', '√(']

export function removeLastToken(expression: string) {
  const token = MULTI_CHAR_TOKENS.find((t) => expression.endsWith(t))
  return expression.slice(0, expression.length - (token?.length ?? 1))
}
