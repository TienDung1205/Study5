import { forwardRef, type ChangeEvent, type ComponentPropsWithoutRef } from 'react';

type PickerTextInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'onChange'> & {
  maxLength: number;
  mask?: (value: string) => string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  sanitize: (value: string) => string;
};

export const PickerTextInput = forwardRef<HTMLInputElement, PickerTextInputProps>(function PickerTextInput({
  maxLength,
  mask,
  onChange,
  sanitize,
  ...inputProps
}, ref) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.currentTarget.value;
    const sanitizedValue = sanitize(rawValue);
    event.currentTarget.value = sanitizedValue;
    onChange?.(event);
  }

  const value = String(inputProps.value ?? '');
  const maskedValue = mask?.(value) ?? '';
  const remainingMask = maskedValue.startsWith(value) ? maskedValue.slice(value.length) : maskedValue;

  return <span className="picker-text-shell">
    {mask && remainingMask && <span className="picker-text-mask" aria-hidden="true">
      <span className="picker-text-mask__filled">{value}</span>
      <span>{remainingMask}</span>
    </span>}
    <input
      {...inputProps}
      ref={ref}
      inputMode="numeric"
      maxLength={maxLength}
      onChange={handleChange}
      placeholder={mask ? '' : inputProps.placeholder}
    />
  </span>;
});
