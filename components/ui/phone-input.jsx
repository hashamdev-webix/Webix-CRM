'use client';

import { forwardRef, useCallback } from 'react';
import PhoneInput, { parsePhoneNumber } from 'react-phone-number-input';
import { cn } from '@/lib/utils';

// ── Custom input element ───────────────────────────────────────────────────────
const PhoneNumberInput = forwardRef(({ className, onChange, onCountryChange, ...props }, ref) => {

  const handleKeyDown = (e) => {
    const controlKeys = [
      'Backspace','Delete','Tab','Escape','Enter',
      'ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',
    ];
    if (controlKeys.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return; // allow Ctrl+V, Ctrl+C etc.
    if (/^\d$/.test(e.key)) return;
    if (e.key === '+' && e.target.selectionStart === 0) return;
    e.preventDefault();
  };

  // When pasting, if the text starts with + detect country from calling code
  const handlePaste = useCallback((e) => {
    const pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
    if (!pasted.startsWith('+')) return; // let library handle local numbers

    e.preventDefault();
    // Normalize: keep + and digits only
    const cleaned = '+' + pasted.replace(/[^\d]/g, '');

    try {
      // Parse to get the country
      const parsed = parsePhoneNumber(cleaned);
      if (parsed?.country && onCountryChange) {
        onCountryChange(parsed.country);
      }
    } catch { /* unparseable — still set the value */ }

    // Fire the synthetic change so react-phone-number-input sees the value
    if (onChange) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(e.target, cleaned);
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, [onChange, onCountryChange]);

  return (
    <input
      ref={ref}
      type="tel"
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={cn('PhoneInputInput', className)}
      {...props}
      onChange={onChange}
    />
  );
});
PhoneNumberInput.displayName = 'PhoneNumberInput';

/**
 * PhoneInputField — country flag selector + phone input.
 *
 * Props:
 *   value       – E.164 string e.g. "+14155552671" or ""
 *   onChange    – (value: string) => void
 *   placeholder – string
 *   disabled    – boolean
 *   className   – outer wrapper class
 */
export function PhoneInputField({
  value,
  onChange,
  placeholder = 'Phone number',
  disabled,
  className,
}) {
  return (
    <div
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background ring-offset-background',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <PhoneInput
        international
        // No defaultCountry — field starts blank with no flag pre-selected
        defaultCountry={undefined}
        // Allow the user to type/edit the calling code freely
        countryCallingCodeEditable
        value={value || ''}
        onChange={(val) => onChange(val || '')}
        placeholder={placeholder}
        disabled={disabled}
        inputComponent={PhoneNumberInput}
        // When value is empty, show the placeholder flag (globe)
        addInternationalOption={false}
      />
    </div>
  );
}
