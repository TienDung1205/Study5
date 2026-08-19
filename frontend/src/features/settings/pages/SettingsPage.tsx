import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { getJson, putJson } from '../../../services/api-client';
import type { LearnerProfile } from '../../../types/domain';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => getJson<LearnerProfile>('/users/me') });
  const [currentScore, setCurrentScore] = useState(500); const [targetScore, setTargetScore] = useState(800);
  const [dailyMinutes, setDailyMinutes] = useState(60); const [preferredHour, setPreferredHour] = useState(20);
  const [examDate, setExamDate] = useState('');
  useEffect(() => { const goal = profile.data?.learningGoal; if (!goal) return; setCurrentScore(goal.currentScore ?? 500); setTargetScore(goal.targetScore); setDailyMinutes(goal.dailyMinutes); setPreferredHour(goal.preferredHour); setExamDate(goal.examDate?.slice(0, 10) ?? ''); }, [profile.data]);
  const save = useMutation({ mutationFn: () => putJson('/users/me/learning-goal', { currentScore, targetScore, dailyMinutes, preferredHour, examDate: examDate || undefined, studyDays: [1, 2, 3, 4, 5, 6] }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }) });
  function submit(event: FormEvent) { event.preventDefault(); save.mutate(); }
  if (profile.isPending) return <div className="empty-state">Đang tải cài đặt...</div>;
  return <section><header className="page-header"><div><p className="eyebrow">CÁ NHÂN HÓA</p><h2>Mục tiêu học tập</h2><p className="muted">Lịch học mặc định từ thứ Hai đến thứ Bảy.</p></div></header>
    <form className="settings-form" onSubmit={submit}><label>Điểm hiện tại<input type="number" min={10} max={990} value={currentScore} onChange={(e) => setCurrentScore(Number(e.target.value))} /></label>
      <label>Điểm mục tiêu<input type="number" min={10} max={990} value={targetScore} onChange={(e) => setTargetScore(Number(e.target.value))} /></label>
      <label>Phút học mỗi ngày<input type="number" min={20} max={180} value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))} /></label>
      <label>Giờ học yêu thích<input type="number" min={0} max={23} value={preferredHour} onChange={(e) => setPreferredHour(Number(e.target.value))} /></label>
      <label>Ngày dự thi<input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></label>
      {save.error && <p className="form-error">{save.error.message}</p>}{save.isSuccess && <p className="success-text">Đã lưu mục tiêu.</p>}
      <button className="primary-button" disabled={save.isPending}>Lưu thay đổi</button></form>
  </section>;
}

