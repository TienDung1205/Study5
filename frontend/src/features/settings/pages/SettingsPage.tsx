import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { useToast } from '../../../components/feedback/ToastProvider';
import { DatePickerInput } from '../../../components/forms/DatePickerInput';
import { StudyTimeInput } from '../../../components/forms/StudyTimeInput';
import { getJson, putJson } from '../../../services/api-client';
import type { LearnerProfile } from '../../../types/domain';
import { isRealIsoDate } from '../../../utils/calendar-date';
import { isValidStudyTime, parseStudyTime, toStudyTimeValue } from '../../../utils/study-time';

const targetEndingPhase: Record<number, number> = { 450: 2, 600: 4, 700: 5, 800: 6 };

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => getJson<LearnerProfile>('/users/me') });
  const [preferredTime, setPreferredTime] = useState('20:00');
  const [newWordsPerDay, setNewWordsPerDay] = useState(10);
  const [targetScore, setTargetScore] = useState(800);
  const [examDate, setExamDate] = useState(''); const [studyDays, setStudyDays] = useState([1, 2, 3, 4, 5, 6]);
  useEffect(() => { const goal = profile.data?.learningGoal; if (!goal) return; setNewWordsPerDay(goal.newWordsPerDay); setTargetScore(goal.targetScore); setPreferredTime(toStudyTimeValue(goal.preferredHour, goal.preferredMinute)); setExamDate(goal.examDateIsCustom ? goal.examDate?.slice(0, 10) ?? '' : ''); setStudyDays(goal.studyDays); }, [profile.data]);
  const save = useMutation({
    mutationFn: () => { const { hour: preferredHour, minute: preferredMinute } = parseStudyTime(preferredTime); return putJson('/users/me/learning-goal', { targetScore, newWordsPerDay, preferredHour, preferredMinute, examDate: examDate || null, studyDays }); },
    onSuccess: () => {
      showToast('Đã lưu thay đổi.', 'success');
      return Promise.all([queryClient.invalidateQueries({ queryKey: ['profile'] }), queryClient.invalidateQueries({ queryKey: ['roadmap'] }), queryClient.invalidateQueries({ queryKey: ['today'] })]);
    },
    onError: (error) => showToast(error.message, 'error'),
  });
  const currentScore = profile.data?.learningGoal?.currentScore ?? 0;
  const currentPhasePosition = profile.data?.learningGoal?.currentPhase?.position ?? 1;
  const validStudyDayCount = studyDays.length >= 5 && studyDays.length <= 7;
  const validPreferredTime = isValidStudyTime(preferredTime);
  const validTargetScore = targetScore > currentScore && targetEndingPhase[targetScore] >= currentPhasePosition;
  const estimatedCompletionDate = getEstimatedCompletionDate(profile.data?.learningGoal?.estimatedWeeks);
  const minimumExamDate = estimatedCompletionDate || getTodayDateValue();
  const latestExamDate = getLatestExamDateValue();
  useEffect(() => {
    if (examDate && (examDate < minimumExamDate || examDate > latestExamDate)) setExamDate('');
  }, [examDate, latestExamDate, minimumExamDate]);
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
    if (value && (!isRealIsoDate(value) || value < minimumExamDate || value > latestExamDate)) return false;
    setExamDate(value);
    return true;
  }
  function submit(event: FormEvent) { event.preventDefault(); save.mutate(); }
  if (profile.isPending) return <div className="empty-state">Đang tải cài đặt...</div>;
  return <section><header className="page-header"><div><p className="eyebrow">CÁ NHÂN HÓA</p><h2>Mục tiêu học tập</h2></div></header>
    <div className="goal-score-summary"><span>Điểm hiện tại<strong>{profile.data?.learningGoal?.currentScore ?? 'Chưa có'}</strong></span><span>Mục tiêu<strong>{profile.data?.learningGoal?.targetScore ?? 'Chưa có'}</strong></span></div>
    <form className="settings-form" onSubmit={submit}>
      <fieldset className="goal-target-setting"><legend>Thay đổi mục tiêu TOEIC</legend><div>{[450, 600, 700, 800].map((score) => <button type="button" disabled={score <= currentScore || targetEndingPhase[score] < currentPhasePosition} className={targetScore === score ? 'selected' : ''} key={score} onClick={() => setTargetScore(score)}>{score}</button>)}</div></fieldset>
      <div className="compact-learning-settings">
        <label>Giờ học<StudyTimeInput value={preferredTime} onChange={setPreferredTime} /></label>
      </div>
      <fieldset className="vocabulary-pace-setting"><legend>Từ mới mỗi ngày</legend><div>{[5, 10, 15, 20, 25, 30].map((pace) => <button type="button" className={newWordsPerDay === pace ? 'selected' : ''} key={pace} onClick={() => setNewWordsPerDay(pace)}><strong>{pace}</strong></button>)}</div></fieldset>
      <fieldset className="study-days"><legend>Ngày học trong tuần · tối thiểu 5 ngày</legend>{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((label, day) => <button type="button" className={studyDays.includes(day) ? 'selected' : ''} key={label} onClick={() => toggleStudyDay(day)}>{label}</button>)}</fieldset>
      <label>Ngày dự kiến hoàn thành<input type="date" value={estimatedCompletionDate} readOnly aria-readonly="true" /></label>
      <div className="date-field"><span>Ngày dự thi</span><DatePickerInput min={minimumExamDate} max={latestExamDate} value={examDate} onChange={changeExamDate} /></div>
      <button className="primary-button" disabled={save.isPending || !validStudyDayCount || !validTargetScore || !validPreferredTime}>Lưu thay đổi</button></form>
  </section>;
}

function getTodayDateValue(): string {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today.toISOString().slice(0, 10);
}

function getLatestExamDateValue(): string {
  const latestDate = new Date();
  latestDate.setHours(12, 0, 0, 0);
  latestDate.setFullYear(latestDate.getFullYear() + 20);
  return latestDate.toISOString().slice(0, 10);
}

function getEstimatedCompletionDate(estimatedWeeks?: number): string {
  if (!estimatedWeeks) return '';
  const completionDate = new Date();
  completionDate.setUTCHours(12, 0, 0, 0);
  completionDate.setUTCDate(completionDate.getUTCDate() + estimatedWeeks * 7);
  return completionDate.toISOString().slice(0, 10);
}
