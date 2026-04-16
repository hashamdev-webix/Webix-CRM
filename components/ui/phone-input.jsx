'use client';

import { forwardRef } from 'react';
import PhoneInput from 'react-phone-number-input';
import { cn } from '@/lib/utils';

// Custom input that only allows digits, +, spaces, dashes, parentheses
const PhoneNumberInput = forwardRef(({ className, ...props }, ref) => {
  const handleKeyDown = (e) => {
    // Allow control keys
    const controlKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End',
    ];
    if (controlKeys.includes(e.key)) return;
    // Allow Ctrl/Cmd shortcuts (copy, paste, select all, etc.)
    if (e.ctrlKey || e.metaKey) return;
    // Allow digits
    if (/^\d$/.test(e.key)) return;
    // Allow + only at position 0
    if (e.key === '+' && e.target.selectionStart === 0) return;
    // Block everything else
    e.preventDefault();
  };

  return (
    <input
      ref={ref}
      type="tel"
      onKeyDown={handleKeyDown}
      className={cn('PhoneInputInput', className)}
      {...props}
    />
  );
});
PhoneNumberInput.displayName = 'PhoneNumberInput';

/**
 * PhoneInputField — professional phone input with country flag + code selector.
 *
 * Props:
 *   value           – E.164 string e.g. "+923001234567" (or "")
 *   onChange        – (value: string) => void
 *   placeholder     – string
 *   defaultCountry  – ISO 3166-1 alpha-2, default "PK"
 *   disabled        – boolean
 *   className       – outer wrapper class overrides
 */
export function PhoneInputField({
  value,
  onChange,
  placeholder = 'Phone number',
  defaultCountry = 'PK',
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
        countryCallingCodeEditable={false}
        defaultCountry={defaultCountry}
        value={value || ''}
        onChange={(val) => onChange(val || '')}
        placeholder={placeholder}
        disabled={disabled}
        inputComponent={PhoneNumberInput}
      />
    </div>
  );
}
