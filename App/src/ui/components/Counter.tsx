import { Minus, Plus } from 'lucide-react';
import { texts } from '../../texts';
import { Button } from './Button';

export interface CounterProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

/** Big rep counter: − / +, quick +5 / +10 and a typeable total. */
export function Counter({ value, onChange, max = 9999 }: CounterProps) {
  const set = (v: number) => onChange(Math.max(0, Math.min(max, Math.round(v))));
  return (
    <div className="counter" role="group" aria-label={texts.log.repsLabel}>
      <div className="counter__row">
        <button type="button" className="counter__btn" onClick={() => set(value - 1)} disabled={value <= 0} aria-label={texts.log.decrease}>
          <Minus size={28} strokeWidth={2.5} />
        </button>
        <input
          className="counter__value"
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={value === 0 ? '' : String(value)}
          placeholder="0"
          aria-label={texts.log.typeTotal}
          onChange={(e) => set(e.target.value === '' ? 0 : Number(e.target.value))}
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="counter__btn counter__btn--primary" onClick={() => set(value + 1)} aria-label={texts.log.increase}>
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>
      <div className="counter__quick">
        <Button size="sm" onClick={() => set(value + 5)}>
          {texts.log.plus5}
        </Button>
        <Button size="sm" onClick={() => set(value + 10)}>
          {texts.log.plus10}
        </Button>
      </div>
    </div>
  );
}
