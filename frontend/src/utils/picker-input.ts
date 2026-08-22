import { daysInMonth, isRealIsoDate } from './calendar-date';

export function sanitizeDateTextInput(rawValue: string, min = '', max = ''): string {
  const acceptedDigits: string[] = [];
  for (const digit of rawValue.replace(/\D/g, '').slice(0, 8)) {
    const candidate = [...acceptedDigits, digit].join('');
    const position = acceptedDigits.length;
    if (position === 0 && Number(digit) > 3) continue;
    if (position === 1 && (Number(candidate.slice(0, 2)) < 1 || Number(candidate.slice(0, 2)) > 31)) continue;
    if (position === 2 && Number(digit) > 1) continue;
    if (position === 3) {
      const month = Number(candidate.slice(2, 4));
      const day = Number(candidate.slice(0, 2));
      if (month < 1 || month > 12 || day > (month === 2 ? 29 : daysInMonth(2024, month))) continue;
    }
    if (position >= 4 && min && max) {
      const yearPrefix = candidate.slice(4);
      const minYear = Number(min.slice(0, 4));
      const maxYear = Number(max.slice(0, 4));
      const canBecomeAllowedYear = Array.from({ length: maxYear - minYear + 1 }, (_, index) => String(minYear + index))
        .some((year) => year.startsWith(yearPrefix));
      if (!canBecomeAllowedYear) continue;
    }
    if (position === 7) {
      const day = candidate.slice(0, 2);
      const month = candidate.slice(2, 4);
      const year = candidate.slice(4, 8);
      const isoDate = `${year}-${month}-${day}`;
      if (!isRealIsoDate(isoDate) || (min && isoDate < min) || (max && isoDate > max)) continue;
    }
    acceptedDigits.push(digit);
  }
  const digits = acceptedDigits.join('');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function getDateInputMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const filled = `${digits}${'ddmmyyyy'.slice(digits.length)}`;
  return `${filled.slice(0, 2)}/${filled.slice(2, 4)}/${filled.slice(4, 8)}`;
}

export function getTimeInputMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  const filled = `${digits}${'hhmm'.slice(digits.length)}`;
  return `${filled.slice(0, 2)}:${filled.slice(2, 4)}`;
}

export function sanitizeTimeTextInput(rawValue: string): string {
  const acceptedDigits: string[] = [];
  for (const digit of rawValue.replace(/\D/g, '').slice(0, 4)) {
    const candidate = [...acceptedDigits, digit].join('');
    const position = acceptedDigits.length;
    if (position === 0 && Number(digit) > 2) continue;
    if (position === 1 && Number(candidate.slice(0, 2)) > 23) continue;
    if (position === 2 && Number(digit) > 5) continue;
    acceptedDigits.push(digit);
  }
  const digits = acceptedDigits.join('');
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}
