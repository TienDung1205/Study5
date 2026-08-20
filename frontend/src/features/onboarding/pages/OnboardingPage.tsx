import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, Clock3, Flag, Gauge, Route } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { putJson } from '../../../services/api-client';

const targetOptions = [450, 650, 800, 900, 990];
const minuteOptions = [30, 60, 90];
const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

interface OnboardingResult {
  plan: {
    estimatedWeeks: number;
    startingPhasePosition: number;
    startingPhaseTitle: string;
    suggestedExamDate: string;
  };
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentScore, setCurrentScore] = useState(450);
  const [targetScore, setTargetScore] = useState(800);
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [studyDays, setStudyDays] = useState([1, 2, 3, 4, 5, 6]);
  const [examDate, setExamDate] = useState('');

  const complete = useMutation({
    mutationFn: () => putJson<OnboardingResult>('/users/me/onboarding', {
      currentScore,
      targetScore,
      dailyMinutes,
      studyDays,
      examDate: examDate || undefined,
      preferredHour: 20,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      navigate('/today?welcome=1', { replace: true });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    complete.mutate();
  }

  return <main className="onboarding-page">
    <section className="onboarding-shell">
      <header className="onboarding-header"><div className="onboarding-logo"><Route size={24} /></div><div><p className="eyebrow">BƯỚC 1/1 · THIẾT LẬP ĐẦU VÀO</p><h1>Tạo lộ trình TOEIC của bạn</h1><p>Điểm đầu vào quyết định Phase bắt đầu và số tuần dự kiến. Bạn có thể thay đổi lịch học sau.</p></div></header>
      <form className="onboarding-form" onSubmit={submit}>
        <section className="onboarding-section"><div className="onboarding-section-title"><Gauge size={21} /><div><h2>Điểm hiện tại</h2><p>Dùng điểm thi thử gần nhất. Nếu chưa từng thi, chọn mức bạn ước lượng.</p></div></div>
          <div className="score-input"><input aria-label="Điểm TOEIC hiện tại" type="range" min={10} max={900} step={5} value={currentScore} onChange={(event) => setCurrentScore(Number(event.target.value))} /><output>{currentScore}</output></div>
          <div className="score-hints"><span>Mất gốc · 10</span><span>Trung bình · 500</span><span>Khá · 750+</span></div>
        </section>

        <section className="onboarding-section"><div className="onboarding-section-title"><Flag size={21} /><div><h2>Mục tiêu</h2><p>Mục tiêu phải cao hơn điểm hiện tại ít nhất 50 điểm.</p></div></div>
          <div className="choice-grid target-choices">{targetOptions.map((score) => <button type="button" disabled={score < currentScore + 50} className={targetScore === score ? 'selected' : ''} key={score} onClick={() => setTargetScore(score)}><strong>{score}{score < 990 ? '+' : ''}</strong><span>{score <= 450 ? 'Xây nền' : score <= 650 ? 'Giao tiếp công việc' : score <= 800 ? 'Mục tiêu phổ biến' : score < 990 ? 'Nâng cao' : 'Điểm tối đa'}</span>{targetScore === score && <Check size={16} />}</button>)}</div>
          {targetScore < currentScore + 50 && <p className="form-error">Hãy chọn mục tiêu lớn hơn điểm hiện tại ít nhất 50 điểm.</p>}
        </section>

        <section className="onboarding-section"><div className="onboarding-section-title"><Clock3 size={21} /><div><h2>Nhịp học mỗi ngày</h2><p>Lộ trình sẽ dài hoặc ngắn theo tổng số phút học mỗi tuần.</p></div></div>
          <div className="choice-grid minute-choices">{minuteOptions.map((minutes) => <button type="button" className={dailyMinutes === minutes ? 'selected' : ''} key={minutes} onClick={() => setDailyMinutes(minutes)}><strong>{minutes} phút</strong><span>{minutes === 30 ? 'Nhẹ nhàng' : minutes === 60 ? 'Khuyến nghị' : 'Tăng tốc'}</span></button>)}</div>
          <fieldset className="onboarding-days"><legend>Ngày học trong tuần</legend>{weekdayLabels.map((label, day) => <button type="button" className={studyDays.includes(day) ? 'selected' : ''} key={label} onClick={() => setStudyDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort())}>{label}</button>)}</fieldset>
        </section>

        <section className="onboarding-section compact"><div className="onboarding-section-title"><CalendarDays size={21} /><div><h2>Ngày dự thi</h2><p>Không bắt buộc. Nếu bỏ trống, hệ thống tự đề xuất theo lộ trình.</p></div></div><input className="exam-date-input" type="date" min={new Date().toISOString().slice(0, 10)} value={examDate} onChange={(event) => setExamDate(event.target.value)} /></section>
        {complete.error && <p className="form-error">{complete.error.message}</p>}
        <button className="onboarding-submit" disabled={complete.isPending || studyDays.length === 0 || targetScore < currentScore + 50}>{complete.isPending ? 'Đang tính lộ trình...' : 'Tạo lộ trình của tôi'}</button>
        <p className="onboarding-note">Lộ trình dựa trên cấu trúc kỹ năng công khai của Study4 và sẽ tiếp tục điều chỉnh bằng kết quả checkpoint của bạn.</p>
      </form>
    </section>
  </main>;
}
