import React, { useState, useEffect, useRef } from 'react';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string | undefined | null;
  onChange?: (val: number | undefined) => void;
  onValueChange?: (val: number | undefined, rawStr: string) => void;
  currencySymbol?: string;
  allowDecimals?: boolean;
  maxDecimals?: number;
  label?: React.ReactNode;
  labelExtra?: React.ReactNode;
  required?: boolean;
  error?: React.ReactNode;
  helperText?: React.ReactNode;
}

/**
 * Format a numeric value to a localized currency string with mask.
 * Example: 50000 -> "$ 50.000"
 * Example: 50000.75 -> "$ 50.000,75"
 */
export function formatCurrencyMask(
  val: number | string | undefined | null,
  currencySymbol = '$'
): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '.'));
  if (isNaN(num)) return '';

  const hasDecimals = num % 1 !== 0;
  const formatted = num.toLocaleString('es-CO', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return `${currencySymbol} ${formatted}`.trim();
}

/**
 * Format a numeric value for unmasked editing when focused.
 * If decimal part is 0, returns raw integer string (e.g. "50000").
 * If decimal part is non-zero, keeps decimals (e.g. "50000.75").
 */
export function formatUnmaskedValue(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '.'));
  if (isNaN(num)) return '';

  if (num % 1 === 0) {
    return Math.round(num).toString();
  }
  return parseFloat(num.toFixed(4)).toString();
}

/**
 * CurrencyInput
 * Componente transversal para captura de montos y moneda.
 * - En FOCO: Pierde la máscara monetaria, permite dejar el campo vacío,
 *   y si los decimales son 0 no los representa (ej: "50000").
 *   Si tiene decimales distintos de 0, los preserva (ej: "50000.5").
 * - Al PERDER EL FOCO: Aplica máscara completa con separadores de miles y decimales ("$ 50.000" o "$ 50.000,50").
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      currencySymbol = '$',
      allowDecimals = true,
      maxDecimals = 2,
      placeholder = '0',
      className = '',
      onFocus,
      onBlur,
      disabled,
      label,
      labelExtra,
      required,
      error,
      helperText,
      id,
      ...restProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [rawInput, setRawInput] = useState(() => formatUnmaskedValue(value));
    const [cleared, setCleared] = useState(false);
    const prevValueRef = useRef(value);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Only update rawInput when prop `value` truly changes from parent
    useEffect(() => {
      if (prevValueRef.current !== value) {
        prevValueRef.current = value;
        setRawInput(formatUnmaskedValue(value));
        setCleared(value === undefined || value === null || value === '');
      }
    }, [value]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (!cleared) {
        setRawInput(formatUnmaskedValue(value));
      }
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      const cleanStr = rawInput.trim().replace(/,/g, '.');
      if (cleanStr === '') {
        setCleared(true);
        onChange?.(undefined);
        onValueChange?.(undefined, '');
      } else {
        const parsed = parseFloat(cleanStr);
        if (!isNaN(parsed)) {
          setCleared(false);
          onChange?.(parsed);
          onValueChange?.(parsed, cleanStr);
        } else {
          setCleared(true);
          onChange?.(undefined);
          onValueChange?.(undefined, '');
        }
      }

      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let text = e.target.value;

      // Allow only numbers, dot, comma, and minus
      if (allowDecimals) {
        text = text.replace(/[^0-9.,-]/g, '');
      } else {
        text = text.replace(/[^0-9-]/g, '');
      }

      setRawInput(text);

      const cleanStr = text.trim().replace(/,/g, '.');
      if (cleanStr === '' || cleanStr === '-') {
        setCleared(true);
        onChange?.(undefined);
        onValueChange?.(undefined, text);
      } else {
        const parsed = parseFloat(cleanStr);
        if (!isNaN(parsed)) {
          setCleared(false);
          onChange?.(parsed);
          onValueChange?.(parsed, text);
        }
      }
    };

    const effectiveVal = cleared ? undefined : (isFocused ? rawInput : value);
    const displayValue = isFocused
      ? rawInput
      : formatCurrencyMask(effectiveVal, currencySymbol);

    const inputElement = (
      <input
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }}
        id={id}
        role="spinbutton"
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        className={`w-full h-9 px-3 bg-slate-900 border ${
          error ? 'border-red-500' : 'border-slate-700/80'
        } rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 font-mono transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
        {...restProps}
      />
    );

    if (label || labelExtra || error || helperText) {
      return (
        <div className="w-full flex flex-col text-left">
          {(label || labelExtra) && (
            <div className="flex items-center justify-between mb-1 gap-2">
              {label && (
                <label
                  htmlFor={id}
                  className="block text-xs font-semibold text-slate-300"
                >
                  {label}
                  {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
              )}
              {labelExtra}
            </div>
          )}
          {inputElement}
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
        </div>
      );
    }

    return inputElement;
  }
);

CurrencyInput.displayName = 'CurrencyInput';
