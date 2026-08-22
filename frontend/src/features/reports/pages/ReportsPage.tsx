import { useQuery } from '@tanstack/react-query';
import { Award, BookOpenCheck, Clock3, Flame, Target } from 'lucide-react';
import { getJson } from '../../../services/api-client';

interface WeeklyReport {
  completedDays: number; scheduledDays: number; completedItems: number; totalItems: number;
  completionRate: number; studyMinutes: number; latestScore: number | null; streakCount: number; totalXp: number;
  daily: Array<{ date: string; status: string; completed: number; total: number }>;
  partMastery: Array<{ part: string; accuracy: number | null; correctAnswers: number | null; totalQuestions: number | null; mastered: boolean }>;
  practiceAttempts: number; practiceCorrectAnswers: number; practiceTotalQuestions: number; practiceAccuracy: number | null;
  practiceBySkill: Array<{ skill: string; correctAnswers: number; totalQuestions: number; attempts: number; accuracy: number | null }>;
  recentPracticeAttempts: Array<{ id: string; lessonTitle: string; skill: string; correctAnswers: number; totalQuestions: number; accuracy: number; submittedAt: string }>;
}

export function ReportsPage() {
  const report = useQuery({ queryKey: ['weekly-report'], queryFn: () => getJson<WeeklyReport>('/reports/weekly') });
  if (report.isPending) return <div className="empty-state">Đang tổng hợp báo cáo...</div>;
  if (report.isError) return <div className="error-state">{report.error.message}</div>;
  const data = report.data;
  const metrics = [
    [BookOpenCheck, `${data.completedDays}/${data.scheduledDays}`, 'Ngày hoàn thành'],
    [Clock3, `${data.studyMinutes} phút`, 'Thời gian tập trung'],
    [Flame, `${data.streakCount} ngày`, 'Streak hiện tại'],
    [Award, `${data.totalXp} XP`, 'Tổng kinh nghiệm'],
    [Target, data.practiceAccuracy === null ? '—' : `${Math.round(data.practiceAccuracy * 100)}%`, `${data.practiceAttempts} mini practice`],
  ] as const;
  return <section><header className="page-header"><div><p className="eyebrow">TIẾN ĐỘ 7 NGÀY</p><h2>Tiến độ & thống kê</h2>
    <p className="muted">Tỷ lệ hoàn thành {Math.round(data.completionRate * 100)}% · Điểm gần nhất {data.latestScore ?? 'chưa có'}</p></div></header>
    <div className="metric-grid">{metrics.map(([Icon, value, label]) => <article className="metric-card" key={label}><Icon /><strong>{value}</strong><span>{label}</span></article>)}</div>
    <div className="table-card"><h3>Kết quả mini practice trên web</h3>{data.practiceBySkill.length ? <div className="mastery-grid">{data.practiceBySkill.map((skill) => <article className={(skill.accuracy ?? 0) >= 0.8 ? 'mastered' : ''} key={skill.skill}><span>{skillLabel(skill.skill)}</span><strong>{skill.accuracy === null ? '—' : `${Math.round(skill.accuracy * 100)}%`}</strong><small>{skill.correctAnswers}/{skill.totalQuestions} câu · {skill.attempts} lượt</small></article>)}</div> : <p className="muted">Chưa có kết quả. Hãy nộp mini practice trong phần Tiếp tục học.</p>}</div>
    {data.recentPracticeAttempts.length > 0 && <div className="table-card"><h3>Các lượt luyện gần nhất</h3><div className="simple-table">{data.recentPracticeAttempts.map((attempt) => <div key={attempt.id}><span>{attempt.lessonTitle}<small>{new Date(attempt.submittedAt).toLocaleString('vi-VN')}</small></span><strong>{attempt.correctAnswers}/{attempt.totalQuestions}</strong><em>{Math.round(attempt.accuracy * 100)}%</em></div>)}</div></div>}
    <div className="table-card"><h3>Độ chính xác theo Part</h3>{data.partMastery.length ? <div className="mastery-grid">{data.partMastery.map((part) => <article className={part.mastered ? 'mastered' : ''} key={part.part}><span>{part.part.replace('_', ' ')}</span><strong>{part.accuracy === null ? '—' : `${Math.round(part.accuracy * 100)}%`}</strong><small>{part.mastered ? 'Đạt chuẩn 80%' : 'Tiếp tục luyện'}</small></article>)}</div> : <p className="muted">Hãy nộp kết quả bài luyện ngoài để hệ thống đo từng Part.</p>}</div>
    <div className="table-card"><h3>Tiến độ từng ngày</h3><div className="simple-table">{data.daily.map((day) => <div key={day.date}><span>{new Date(day.date).toLocaleDateString('vi-VN')}</span><strong>{day.completed}/{day.total}</strong><em>{day.status}</em></div>)}</div></div>
  </section>;
}

function skillLabel(skill: string): string {
  return ({ VOCABULARY: 'Từ vựng', GRAMMAR: 'Ngữ pháp', LISTENING: 'Listening', READING: 'Reading', REVIEW: 'Ôn tập', HABIT: 'Thói quen' } as Record<string, string>)[skill] ?? skill;
}
