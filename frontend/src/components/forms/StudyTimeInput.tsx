import { Clock3 } from 'lucide-react';
import { getTimeInputMask, sanitizeTimeTextInput } from '../../utils/picker-input';
import { PickerTextInput } from './PickerTextInput';

interface StudyTimeInputProps {
  onChange: (value: string) => void;
  value: string;
}

export function StudyTimeInput({ onChange, value }: StudyTimeInputProps) {
  return <div className="study7-manual-time">
    <PickerTextInput
      aria-label="Giờ học"
      autoComplete="off"
      maxLength={5}
      mask={getTimeInputMask}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder="hh:mm"
      sanitize={sanitizeTimeTextInput}
      value={value}
    />
    <Clock3 size={18} aria-hidden="true" />
  </div>;
}
