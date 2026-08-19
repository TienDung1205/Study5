import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { getJson, putJson } from '../../../services/api-client';
import type { LearnerProfile } from '../../../types/domain';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => getJson<LearnerProfile>('/users/me') });
  const [currentScore, setCurrentScore] = useState(500); const [targetScore, setTargetScore] = useState(800);
  const [dailyMinutes, setDailyMinutes] = useState(60); const [preferredHour, setPreferredHour] = useState(20);
  const [examDate, setExamDate] = useState(''); const [studyDays, setStudyDays] = useState([1, 2, 3, 4, 5, 6]);
  useEffect(() => { const goal = profile.data?.learningGoal; if (!goal) return; setCurrentScore(goal.currentScore ?? 500); setTargetScore(goal.targetScore); setDailyMinutes(goal.dailyMinutes); setPreferredHour(goal.preferredHour); setExamDate(goal.examDate?.slice(0, 10) ?? ''); setStudyDays(goal.studyDays); }, [profile.data]);
  const save = useMutation({ mutationFn: () => putJson('/users/me/learning-goal', { currentScore, targetScore, dailyMinutes, preferredHour, examDate: examDate || undefined, studyDays }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }) });
  function submit(event: FormEvent) { event.preventDefault(); save.mutate(); }
  if (profile.isPending) return <div className="empty-state">Đang tải cài đặt...</div>;
  return <section><header className="page-header"><div><p className="eyebrow">CÁ NHÂN HÓA</p><h2>Mục tiêu học tập</h2><p className="muted">Lịch học mặc định từ thứ Hai đến thứ Bảy.</p></div></header>
    <form className="settings-form" onSubmit={submit}><label>Điểm hiện tại<input type="number" min={10} max={990} value={currentScore} onChange={(e) => setCurrentScore(Number(e.target.value))} /></label>
      <label>Điểm mục tiêu<input type="number" min={10} max={990} value={targetScore} onChange={(e) => setTargetScore(Number(e.target.value))} /></label>
      <label>Phút học mỗi ngày<input type="number" min={20} max={180} value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))} /></label>
      <label>Giờ học yêu thích<input type="number" min={0} max={23} value={preferredHour} onChange={(e) => setPreferredHour(Number(e.target.value))} /></label>
      <label>Ngày dự thi<input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></label>
      <fieldset className="study-days"><legend>Ngày học trong tuần</legend>{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((label, day) => <button type="button" className={studyDays.includes(day) ? 'selected' : ''} key={label} onClick={() => setStudyDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort())}>{label}</button>)}</fieldset>
      {save.error && <p className="form-error">{save.error.message}</p>}{save.isSuccess && <p className="success-text">Đã lưu mục tiêu.</p>}
      <button className="primary-button" disabled={save.isPending || studyDays.length === 0}>Lưu thay đổi</button></form>
  </section>;
}
