import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

/** Switch control; the whole row is the tap target. */
export function Toggle({ checked, onChange, label, hint }: ToggleProps) {
  return (
    <button type="button" className="toggle" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {hint ? <span className="toggle__hint">{hint}</span> : null}
      </span>
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
    </button>
  );
}

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  label: string;
}

export function Stepper({ value, min, max, step = 1, onChange, format, label }: StepperProps) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper__btn" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label="−">
        <Minus size={18} />
      </button>
      <span className="stepper__value" aria-live="polite">
        {format(value)}
      </span>
      <button type="button" className="stepper__btn" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label="+">
        <Plus size={18} />
      </button>
    </div>
  );
}
