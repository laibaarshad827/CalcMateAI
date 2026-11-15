'use client'

import { useState } from 'react'
import { useApp, type KeyKind } from '@/components/app-provider'
import { cn } from '@/lib/utils'
import { CalcKey } from './calc-key'

interface SciKey {
  display: React.ReactNode
  label: string
  value: string
  kind: KeyKind
}

function trigKeys(inverse: boolean): SciKey[] {
  return (['sin', 'cos', 'tan'] as const).map((fn) =>
    inverse
      ? {
          display: (
            <span>
              {fn}
              <sup>−1</sup>
            </span>
          ),
          label: `Inverse ${fn === 'sin' ? 'sine' : fn === 'cos' ? 'cosine' : 'tangent'}`,
          value: `a${fn}(`,
          kind: 'operand' as const,
        }
      : {
          display: fn,
          label: fn === 'sin' ? 'Sine' : fn === 'cos' ? 'Cosine' : 'Tangent',
          value: `${fn}(`,
          kind: 'operand' as const,
        },
  )
}

const OTHER_KEYS: SciKey[] = [
  { display: 'π', label: 'Pi', value: 'π', kind: 'operand' },
  { display: 'ln', label: 'Natural logarithm', value: 'ln(', kind: 'operand' },
  { display: 'log', label: 'Logarithm base 10', value: 'log(', kind: 'operand' },
  { display: '√', label: 'Square root', value: '√(', kind: 'operand' },
  { display: 'e', label: "Euler's number", value: 'e', kind: 'operand' },
  {
    display: (
      <span>
        x<sup>2</sup>
      </span>
    ),
    label: 'Square',
    value: '^2',
    kind: 'postfix',
  },
  {
    display: (
      <span>
        x<sup>y</sup>
      </span>
    ),
    label: 'Power',
    value: '^',
    kind: 'operator',
  },
  { display: 'n!', label: 'Factorial', value: '!', kind: 'postfix' },
  {
    display: (
      <span>
        10<sup>x</sup>
      </span>
    ),
    label: 'Ten to the power of',
    value: '10^(',
    kind: 'operand',
  },
]

export function ScientificPanel() {
  const { input, settings, updateSettings } = useApp()
  const [inverse, setInverse] = useState(false)
  const keys = [...trigKeys(inverse), ...OTHER_KEYS]

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Scientific functions">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex rounded-xl bg-muted/60 p-1" role="radiogroup" aria-label="Angle unit">
          {(['deg', 'rad'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={settings.angleMode === mode}
              onClick={() => updateSettings({ angleMode: mode })}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                settings.angleMode === mode
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={inverse}
          onClick={() => setInverse((v) => !v)}
          className={cn(
            'rounded-xl text-xs font-semibold uppercase tracking-wide transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
            inverse ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:text-foreground',
          )}
        >
          Inverse
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {keys.map((key) => (
          <CalcKey key={key.label} label={key.label} variant="function" onClick={() => input(key.value, key.kind)}>
            {key.display}
          </CalcKey>
        ))}
      </div>
    </div>
  )
}
