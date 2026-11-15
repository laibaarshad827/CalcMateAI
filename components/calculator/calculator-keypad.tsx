'use client'

import { Delete } from 'lucide-react'
import { useApp, type KeyKind } from '@/components/app-provider'
import { CalcKey, type CalcKeyVariant } from './calc-key'

interface KeyDef {
  display: React.ReactNode
  label: string
  variant: CalcKeyVariant
  action: { type: 'input'; value: string; kind: KeyKind } | { type: 'clear' } | { type: 'backspace' } | { type: 'equals' }
  className?: string
}

const num = (n: string): KeyDef => ({
  display: n,
  label: n,
  variant: 'number',
  action: { type: 'input', value: n, kind: 'operand' },
})

const op = (value: string, display: string, label: string): KeyDef => ({
  display,
  label,
  variant: 'operator',
  action: { type: 'input', value, kind: 'operator' },
})

const KEYS: KeyDef[] = [
  { display: '(', label: 'Open parenthesis', variant: 'action', action: { type: 'input', value: '(', kind: 'operand' } },
  { display: ')', label: 'Close parenthesis', variant: 'action', action: { type: 'input', value: ')', kind: 'postfix' } },
  { display: '%', label: 'Percent', variant: 'action', action: { type: 'input', value: '%', kind: 'postfix' } },
  { display: 'AC', label: 'Clear all', variant: 'action', action: { type: 'clear' }, className: 'text-destructive' },
  num('7'),
  num('8'),
  num('9'),
  op('/', '÷', 'Divide'),
  num('4'),
  num('5'),
  num('6'),
  op('*', '×', 'Multiply'),
  num('1'),
  num('2'),
  num('3'),
  op('-', '−', 'Subtract'),
  num('0'),
  { display: '.', label: 'Decimal point', variant: 'number', action: { type: 'input', value: '.', kind: 'operand' } },
  { display: <Delete className="size-5" aria-hidden />, label: 'Backspace', variant: 'action', action: { type: 'backspace' } },
  op('+', '+', 'Add'),
]

export function CalculatorKeypad() {
  const { input, clear, backspace, evaluate, calculator } = useApp()

  function handle(key: KeyDef) {
    switch (key.action.type) {
      case 'input':
        return input(key.action.value, key.action.kind)
      case 'clear':
        return clear()
      case 'backspace':
        return backspace()
      case 'equals':
        return evaluate()
    }
  }

  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Standard keypad">
      {KEYS.map((key) => (
        <CalcKey key={key.label} label={key.label} variant={key.variant} className={key.className} onClick={() => handle(key)}>
          {key.display}
        </CalcKey>
      ))}
      <CalcKey
        label="Equals"
        variant="equals"
        className="col-span-4"
        onClick={() => evaluate()}
        disabled={calculator.pending}
      >
        =
      </CalcKey>
    </div>
  )
}
