import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookHeart, Check, Clock3, Flame, Pause, Sparkles, TicketCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getJson, patchJson, postJson } from '../../../services/api-client';
import type { DailyAssignment, LearnerProfile, PlanType } from '../../../types/domain';

const planLabels: Record<PlanType, string> = { RECOVERY: 'Phục hồi', STANDARD: 'Tiêu chuẩn', ACCELERATED: 'Tăng tốc' };
interface ActiveSession { itemId: string; sessionId: string; startedAt: number }

export function TodayPage() {
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [journal, setJournal] = useState(''); const [mood, setMood] = useState('normal');
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const [recoveryDate, setRecoveryDate] = useState(tomorrow.toISOString().slice(0, 10));

  const today = useQuery({ queryKey: ['today'], queryFn: () => getJson<DailyAssignment>('/assignments/today') });
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => getJson<LearnerProfile>('/users/me') });
  const recent = useQuery({ queryKey: ['recent-assignments'], queryFn: () => getJson<DailyAssignment[]>('/assignments/recent') });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['today'] }),
    queryClient.invalidateQueries({ queryKey: ['profile'] }),
    queryClient.invalidateQueries({ queryKey: ['recent-assignments'] }),
    queryClient.invalidateQueries({ queryKey: ['roadmap'] }),
  ]);
  const complete = useMutation({ mutationFn: (id: string) => postJson(`/assignments/items/${id}/complete`), onSuccess: refresh });
  const start = useMutation({
    mutationFn: async (id: string) => {
      await postJson(`/assignments/items/${id}/start`);
      const session = await postJson<{ id: string; startedAt: string }>('/assignments/study-sessions', { assignmentItemId: id });
      return { itemId: id, sessionId: session.id, startedAt: new Date(session.startedAt).getTime() };
    },
    onSuccess: (session) => { setActiveSession(session); void queryClient.invalidateQueries({ queryKey: ['today'] }); },
  });
  const finishSession = useMutation({
    mutationFn: async (session: ActiveSession) => patchJson(`/assignments/study-sessions/${session.sessionId}/finish`, {
      durationSeconds: Math.min(86_400, Math.max(1, Math.round((Date.now() - session.startedAt) / 1000))),
    }),
    onSuccess: () => { setActiveSession(null); void queryClient.invalidateQueries({ queryKey: ['weekly-report'] }); },
  });
  const selectPlan = useMutation({ mutationFn: (planType: PlanType) => patchJson(`/assignments/${today.data?.id}/select-plan`, { planType }), onSuccess: refresh });
  const reschedule = useMutation({
    mutationFn: (assignmentId: string) => patchJson(`/assignments/${assignmentId}/reschedule`, { scheduledDate: recoveryDate }),
    onSuccess: refresh,
  });
  const saveJournal = useMutation({ mutationFn: () => postJson('/assignments/journal', { content: journal, mood }), onSuccess: () => setJournal('') });

  if (today.isPending || profile.isPending) return <div className="empty-state">Đang chuẩn bị nhiệm vụ hôm nay...</div>;
  if (today.isError) return <div className="error-state">{today.error.message}</div>;
  const assignment = today.data; const done = assignment.items.filter((item) => item.completedAt).length;
  const overdue = recent.data?.filter((item) => item.status === 'OVERDUE') ?? [];

  if (assignment.status === 'EXCUSED') return <section><TodayHeader assignment={assignment} profile={profile.data} />
    <div className="rest-day-card"><Sparkles size={34} /><div><p className="eyebrow">NGÀY NGHỈ THEO LỊCH</p><h3>Hôm nay bạn được phép nghỉ</h3><p>Streak sẽ không bị mất. Có thể xem lại sổ lỗi hoặc nghỉ hoàn toàn để quay lại vào ngày học tiếp theo.</p></div></div>
    <Badges profile={profile.data} /></section>;

  return <section><TodayHeader assignment={assignment} profile={profile.data} />
    <div className="status-row"><span><Clock3 size={16} /> Deadline {new Date(assignment.dueAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
      <span>{done}/{assignment.items.length} nhiệm vụ · {profile.data?.progress?.totalXp ?? 0} XP</span></div>
    <div className="plan-banner"><div><span className="plan-label">CHỌN NHỊP HỌC</span><h3>{planLabels[assignment.planType]}</h3>
      <div className="inline-actions">{(Object.keys(planLabels) as PlanType[]).map((type) => <button className="ghost-light" disabled={done > 0 || selectPlan.isPending} key={type} onClick={() => selectPlan.mutate(type)}>{planLabels[type]}</button>)}</div></div><Sparkles size={30} /></div>
    {(complete.error || start.error || finishSession.error) && <p className="form-error">{complete.error?.message ?? start.error?.message ?? finishSession.error?.message}</p>}
    <div className="assignment-list">{assignment.items.map((item) => <article className={`assignment-card${item.completedAt ? ' completed' : ''}`} key={item.id}>
      <span className="check-box">{item.completedAt && <Check size={16} />}</span><div><h3>{item.lesson ? <Link className="lesson-title-link" to={`/roadmap?lesson=${item.lesson.id}`}>{item.title}</Link> : item.title}</h3><p>{item.durationMinutes} phút · +{item.xpReward} XP · {item.lesson?.skill ?? 'External'}</p></div>
      <div className="inline-actions">{!item.completedAt && activeSession?.itemId !== item.id && <button disabled={Boolean(activeSession)} onClick={() => start.mutate(item.id)}>{item.startedAt ? 'Tiếp tục bấm giờ' : 'Bắt đầu'}</button>}
      {activeSession?.itemId === item.id && <button className="timer-button" onClick={() => finishSession.mutate(activeSession)}><Pause size={14} /> Dừng giờ</button>}
      {!item.completedAt && !item.externalResource && <button onClick={() => complete.mutate(item.id)}>Hoàn thành</button>}
      {item.externalResource && <Link className="small-link" to="/external">Làm và nộp kết quả</Link>}
      {item.completedAt && <span>Đã xong</span>}</div></article>)}</div>
    {assignment.status === 'COMPLETED' && <div className="victory-box"><h3>Bạn đã chiến thắng hôm nay!</h3><p>Streak và XP đã cập nhật. AI Coach sẽ chuẩn bị ngày học tiếp theo, không sửa nhiệm vụ hôm nay.</p></div>}

    {overdue.length > 0 && <section className="recovery-panel"><div><TicketCheck /><h3>Vé trở lại</h3><p>Bạn còn {profile.data?.progress?.recoveryTokens ?? 0} vé. Chọn ngày tương lai để học bù nhiệm vụ quá hạn.</p></div><label>Ngày học bù<input type="date" min={tomorrow.toISOString().slice(0, 10)} value={recoveryDate} onChange={(event) => setRecoveryDate(event.target.value)} /></label><button className="primary-button" disabled={reschedule.isPending || !profile.data?.progress?.recoveryTokens} onClick={() => reschedule.mutate(overdue[0].id)}>Xếp lại nhiệm vụ gần nhất</button>{reschedule.error && <p className="form-error">{reschedule.error.message}</p>}</section>}

    <form className="journal-card" onSubmit={(event: FormEvent) => { event.preventDefault(); saveJournal.mutate(); }}><BookHeart /><div><h3>Nhật ký hôm nay</h3><p className="muted">Một dòng cũng đủ để AI hiểu tình trạng học tập tốt hơn.</p></div><select value={mood} onChange={(event) => setMood(event.target.value)}><option value="great">Rất tốt</option><option value="normal">Bình thường</option><option value="tired">Mệt</option></select><textarea required maxLength={2000} value={journal} onChange={(event) => setJournal(event.target.value)} placeholder="Hôm nay mình vướng ở..." /><button className="primary-button" disabled={saveJournal.isPending}>Lưu nhật ký</button>{saveJournal.isSuccess && <span className="success-text">Đã lưu.</span>}</form>
    <Badges profile={profile.data} />
  </section>;
}

function TodayHeader({ assignment, profile }: { assignment: DailyAssignment; profile?: LearnerProfile }) {
  return <header className="page-header"><div><p className="eyebrow">PHASE {assignment.phase?.position ?? 1}</p><h2>Chiến thắng hôm nay</h2><p className="muted">{assignment.phase?.title}</p></div>
    <div className="streak-card"><Flame size={20} /><div><strong>{profile?.progress?.streakCount ?? 0} ngày</strong><span>streak hiện tại</span></div></div></header>;
}

function Badges({ profile }: { profile?: LearnerProfile }) {
  if (!profile?.badges.length) return null;
  return <section className="badge-section"><h3>Huy hiệu đã nhận</h3><div className="badge-grid">{profile.badges.map((item) => <article key={item.id}><span>🏅</span><div><strong>{item.badge.name}</strong><p>{item.badge.description}</p></div></article>)}</div></section>;
}
