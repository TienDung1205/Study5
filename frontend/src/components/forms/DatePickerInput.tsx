import { vi } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { getDateInputMask, sanitizeDateTextInput } from '../../utils/picker-input';
import { PickerTextInput } from './PickerTextInput';

registerLocale('vi', vi);

interface DatePickerInputProps {
  max: string;
  min: string;
  onChange: (value: string) => void;
  value: string;
}

export function DatePickerInput({ max, min, onChange, value }: DatePickerInputProps) {
  return <DatePicker
    ariaLabel="Ngày dự thi"
    autoComplete="off"
    calendarClassName="study7-calendar"
    customInput={<PickerTextInput
      maxLength={10}
      mask={getDateInputMask}
      sanitize={(inputValue) => sanitizeDateTextInput(inputValue, min, max)}
    />}
    dateFormat="dd/MM/yyyy"
    dropdownMode="select"
    icon={<CalendarDays size={19} />}
    isClearable
    locale="vi"
    maxDate={fromIsoDate(max) ?? undefined}
    minDate={fromIsoDate(min) ?? undefined}
    onChange={(date: Date | null) => onChange(date ? toIsoDate(date) : '')}
    placeholderText="dd/mm/yyyy"
    selected={fromIsoDate(value)}
    showIcon
    showMonthDropdown
    showYearDropdown
    strictParsing
    toggleCalendarOnIconClick
    wrapperClassName="study7-picker study7-date-picker"
  />;
}

function fromIsoDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function toIsoDate(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}
