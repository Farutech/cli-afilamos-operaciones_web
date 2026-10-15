import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CurrencyInput, formatCurrencyMask, formatUnmaskedValue } from '../../src/components/ui/CurrencyInput';

describe('CurrencyInput component and formatting helpers', () => {
  it('formatCurrencyMask formats integers with thousands dots and symbol', () => {
    expect(formatCurrencyMask(50000)).toBe('$ 50.000');
    expect(formatCurrencyMask(1250000)).toBe('$ 1.250.000');
    expect(formatCurrencyMask(0)).toBe('$ 0');
    expect(formatCurrencyMask(null)).toBe('');
  });

  it('formatCurrencyMask preserves decimals if non-zero', () => {
    expect(formatCurrencyMask(50000.5)).toBe('$ 50.000,50');
    expect(formatCurrencyMask(1250.75)).toBe('$ 1.250,75');
  });

  it('formatUnmaskedValue strips decimals if fraction is 0', () => {
    expect(formatUnmaskedValue(50000)).toBe('50000');
    expect(formatUnmaskedValue('50000.00')).toBe('50000');
    expect(formatUnmaskedValue(0)).toBe('0');
  });

  it('formatUnmaskedValue preserves decimals if fraction is non-zero', () => {
    expect(formatUnmaskedValue(50000.5)).toBe('50000.5');
    expect(formatUnmaskedValue('50000.75')).toBe('50000.75');
  });

  it('strips mask when focused and restores mask on blur', () => {
    const handleChange = vi.fn();
    render(<CurrencyInput value={50000} onChange={handleChange} data-testid="currency-field" />);

    const input = screen.getByTestId('currency-field') as HTMLInputElement;
    expect(input.value).toBe('$ 50.000');

    // On focus, mask is removed and integer has no decimals
    fireEvent.focus(input);
    expect(input.value).toBe('50000');

    // On blur, currency mask is reapplied
    fireEvent.blur(input);
    expect(input.value).toBe('$ 50.000');
  });

  it('allows leaving field empty on focus without error', () => {
    const handleChange = vi.fn();
    render(<CurrencyInput value={50000} onChange={handleChange} data-testid="currency-field" />);

    const input = screen.getByTestId('currency-field') as HTMLInputElement;
    fireEvent.focus(input);
    expect(input.value).toBe('50000');

    // Clear field completely
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    expect(handleChange).toHaveBeenCalledWith(undefined);

    // On blur, display is empty
    fireEvent.blur(input);
    expect(input.value).toBe('');
  });

  it('preserves decimals on focus when value has non-zero fraction', () => {
    render(<CurrencyInput value={75000.25} onChange={() => {}} data-testid="currency-field" />);

    const input = screen.getByTestId('currency-field') as HTMLInputElement;
    expect(input.value).toBe('$ 75.000,25');

    fireEvent.focus(input);
    expect(input.value).toBe('75000.25');
  });
});
