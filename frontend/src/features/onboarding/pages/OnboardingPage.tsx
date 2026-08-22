import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, Clock3, Flag, Gauge, Route } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastMessage, useToast } from '../../../components/feedback/ToastProvider';
import { DatePickerInput } from '../../../components/forms/DatePickerInput';
import { StudyTimeInput } from '../../../components/forms/StudyTimeInput';
import { putJson } from '../../../services/api-client';
import { isRealIsoDate } from '../../../utils/calendar-date';
import { isValidStudyTime, parseStudyTime } from '../../../utils/study-time';

const targetOptions = [450, 600, 700, 800];
const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

interface OnboardingResult {
  plan: {
    estimatedWeeks: number;
    startingPhasePosition: number;
    startingPhaseTitle: string;
    endingPhasePosition: number;
    endingPhaseTitle: string;
    suggestedExamDate: string;
    targetVocabularyCount: number;
    estimatedKnownVocabulary: number;
    vocabularyGap: number;
    newWordsPerDay: number;
    phases: Array<{ position: number; title: string; durationDays: number }>;
  };
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [currentScore, setCurrentScore] = useState(450);
  const [targetScore, setTargetScore] = useState(800);
  const [studyDays, setStudyDays] = useState([1, 2, 3, 4, 5, 6]);
  const [examDate, setExamDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('20:00');
  const latestExamDate = getLatestExamDateValue();
  const todayDate = new Date().toISOString().slice(0, 10);
  useEffect(() => {
    if (examDate && (examDate < todayDate || examDate > latestExamDate)) setExamDate('');
  }, [examDate, latestExamDate, todayDate]);

  const complete = useMutation({
    mutationFn: () => {
      const { hour: preferredHour, minute: preferredMinute } = parseStudyTime(preferredTime);
      return putJson<OnboardingResult>('/users/me/onboarding', {
      currentScore,
      targetScore,
      studyDays,
      examDate: examDate || undefined,
      preferredHour,
      preferredMinute,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['roadmap'] });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    complete.mutate();
  }

  function toggleStudyDay(day: number) {
    if (studyDays.includes(day)) {
      if (studyDays.length <= 5) {
        showToast('Cần chọn tối thiểu 5 ngày học mỗi tuần.', 'warning');
        return;
      }
      setStudyDays((current) => current.filter((value) => value !== day));
      return;
    }
    setStudyDays((current) => [...current, day].sort());
  }

  function changeExamDate(value: string): boolean {
    if (value && (!isRealIsoDate(value) || value < todayDate || value > latestExamDate)) return false;
    setExamDate(value);
    return true;
  }


  return <main className="onboarding-page">
    <section className="onboarding-shell">
      <header className="onboarding-header"><div className="onboarding-logo"><Route size={24} /></div><div><p className="eyebrow">BƯỚC 1/1 · THIẾT LẬP ĐẦU VÀO</p><h1>Tạo lộ trình TOEIC của bạn</h1><p>Điểm đầu vào quyết định Phase bắt đầu và số tuần dự kiến. Bạn có thể thay đổi lịch học sau.</p></div></header>
      <form className="onboarding-form" onSubmit={submit}>
        <section className="onboarding-section"><div className="onboarding-section-title"><Gauge size={21} /><div><h2>Điểm hiện tại</h2><p>Dùng điểm thi thử gần nhất. Nếu chưa từng thi, chọn mức bạn ước lượng.</p></div></div>
          <div className="score-input"><input aria-label="Điểm TOEIC hiện tại" type="range" min={10} max={795} step={5} value={currentScore} onChange={(event) => setCurrentScore(Number(event.target.value))} /><output>{currentScore}</output></div>
          <div className="score-hints"><span>Mất gốc · 10</span><span>Trung bình · 500</span><span>Khá · 750+</span></div>
        </section>

        <section className="onboarding-section"><div className="onboarding-section-title"><Flag size={21} /><div><h2>Mục tiêu</h2><p>Chọn một mốc 450, 600, 700 hoặc 800 cao hơn điểm hiện tại.</p></div></div>
          <div className="choice-grid target-choices">{targetOptions.map((score) => <button type="button" disabled={score <= currentScore} className={targetScore === score ? 'selected' : ''} key={score} onClick={() => setTargetScore(score)}><strong>{score}</strong><span>{score === 450 ? 'Xây nền' : score === 600 ? 'Nắm chắc cơ bản' : score === 700 ? 'Tăng tốc' : 'Về đích 800'}</span>{targetScore === score && <Check size={16} />}</button>)}</div>
          {targetScore <= currentScore && <ToastMessage variant="warning">Hãy chọn mục tiêu cao hơn điểm hiện tại.</ToastMessage>}
        </section>

        <section className="onboarding-section"><div className="onboarding-section-title"><Clock3 size={21} /><div><h2>Lịch học</h2><p>Chọn giờ nhắc và những ngày bạn có thể duy trì việc học.</p></div></div>
          <div className="onboarding-time-fields"><label>Giờ học<StudyTimeInput value={preferredTime} onChange={setPreferredTime} /><small>Chọn từ danh sách hoặc nhập theo dạng 24 giờ, ví dụ 16:59.</small></label></div>
          <fieldset className="onboarding-days"><legend>Ngày học trong tuần · tối thiểu 5 ngày</legend>{weekdayLabels.map((label, day) => <button type="button" className={studyDays.includes(day) ? 'selected' : ''} key={label} onClick={() => toggleStudyDay(day)}>{label}</button>)}</fieldset>
        </section>

        <section className="onboarding-section compact"><div className="onboarding-section-title"><CalendarDays size={21} /><div><h2>Ngày dự thi</h2><p>Không bắt buộc. Nếu bỏ trống, hệ thống chỉ đưa ngày gợi ý và không tự lưu vào tài khoản.</p></div></div><DatePickerInput min={todayDate} max={latestExamDate} value={examDate} onChange={changeExamDate} /></section>
        {complete.error && <ToastMessage variant="error">{complete.error.message}</ToastMessage>}
        <button className="onboarding-submit" disabled={complete.isPending || studyDays.length < 5 || studyDays.length > 7 || targetScore <= currentScore || !isValidStudyTime(preferredTime)}>{complete.isPending ? 'Đang tính lộ trình...' : 'Tạo lộ trình của tôi'}</button>
        <p className="onboarding-note">Lộ trình dựa trên cấu trúc kỹ năng công khai của Study4 và sẽ tiếp tục điều chỉnh bằng kết quả checkpoint của bạn.</p>
      </form>
      {complete.data && <section className="onboarding-result">
        <p className="eyebrow">LỘ TRÌNH ĐÃ ĐƯỢC TẠO</p>
        <h2>{complete.data.plan.estimatedWeeks} tuần · {studyDays.length} ngày/tuần</h2>
        <p>Bắt đầu tại <strong>Phase {complete.data.plan.startingPhasePosition} · {complete.data.plan.startingPhaseTitle}</strong> và kết thúc tại <strong>Phase {complete.data.plan.endingPhasePosition} · {complete.data.plan.endingPhaseTitle}</strong>.</p>
        <p>Đích từ vựng: <strong>{complete.data.plan.targetVocabularyCount.toLocaleString('vi-VN')} từ</strong>. Hệ thống ước tính bạn đã biết khoảng {complete.data.plan.estimatedKnownVocabulary.toLocaleString('vi-VN')} từ và cần bổ sung {complete.data.plan.vocabularyGap.toLocaleString('vi-VN')} từ, nhịp {complete.data.plan.newWordsPerDay} từ mới/ngày.</p>
        {!examDate && <p>Ngày thi gợi ý: <strong>{new Date(complete.data.plan.suggestedExamDate).toLocaleDateString('vi-VN')}</strong> · chỉ để tham khảo, chưa được lưu.</p>}
        <div className="onboarding-result-phases">{complete.data.plan.phases.map((phase) => <span key={phase.position}>Phase {phase.position}<small>{phase.title} · {phase.durationDays} ngày</small></span>)}</div>
        <button className="onboarding-submit" type="button" onClick={() => navigate('/today?welcome=1', { replace: true })}>Bắt đầu ngày học đầu tiên</button>
      </section>}
    </section>
  </main>;
}

function getLatestExamDateValue(): string {
  const latestDate = new Date();
  latestDate.setHours(12, 0, 0, 0);
  latestDate.setFullYear(latestDate.getFullYear() + 20);
  return latestDate.toISOString().slice(0, 10);
}
