import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Flame, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getJson, patchJson, postJson } from '../../../services/api-client';
import type { DailyAssignment, LearnerProfile, PlanType } from '../../../types/domain';

const planLabels: Record<PlanType, string> = { RECOVERY: 'Phục hồi', STANDARD: 'Tiêu chuẩn', ACCELERATED: 'Tăng tốc' };

export function TodayPage() {
  const queryClient = useQueryClient();
  const today = useQuery({ queryKey: ['today'], queryFn: () => getJson<DailyAssignment>('/assignments/today') });
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => getJson<LearnerProfile>('/users/me') });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['today'] }), queryClient.invalidateQueries({ queryKey: ['profile'] })]);
  const complete = useMutation({ mutationFn: (id: string) => postJson(`/assignments/items/${id}/complete`), onSuccess: refresh });
  const start = useMutation({ mutationFn: (id: string) => postJson(`/assignments/items/${id}/start`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['today'] }) });
  const selectPlan = useMutation({ mutationFn: (planType: PlanType) => patchJson(`/assignments/${today.data?.id}/select-plan`, { planType }), onSuccess: refresh });
  if (today.isPending || profile.isPending) return <div className="empty-state">Đang chuẩn bị nhiệm vụ hôm nay...</div>;
  if (today.isError) return <div className="error-state">{today.error.message}</div>;
  const assignment = today.data; const done = assignment.items.filter((item) => item.completedAt).length;
  return <section><header className="page-header"><div><p className="eyebrow">PHASE {assignment.phase?.position ?? 1}</p>
    <h2>Chiến thắng hôm nay</h2><p className="muted">{assignment.phase?.title}</p></div>
    <div className="streak-card"><Flame size={20} /><div><strong>{profile.data?.progress?.streakCount ?? 0} ngày</strong><span>streak hiện tại</span></div></div></header>
    <div className="status-row"><span><Clock3 size={16} /> Deadline {new Date(assignment.dueAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
      <span>{done}/{assignment.items.length} nhiệm vụ · {profile.data?.progress?.totalXp ?? 0} XP</span></div>
    <div className="plan-banner"><div><span className="plan-label">CHỌN NHỊP HỌC</span><h3>{planLabels[assignment.planType]}</h3>
      <div className="inline-actions">{(Object.keys(planLabels) as PlanType[]).map((type) => <button className="ghost-light" disabled={done > 0 || selectPlan.isPending} key={type} onClick={() => selectPlan.mutate(type)}>{planLabels[type]}</button>)}</div></div><Sparkles size={30} /></div>
    {complete.error && <p className="form-error">{complete.error.message}</p>}
    <div className="assignment-list">{assignment.items.map((item) => <article className={`assignment-card${item.completedAt ? ' completed' : ''}`} key={item.id}>
      <span className="check-box">{item.completedAt && <Check size={16} />}</span><div><h3>{item.lesson ? <Link className="lesson-title-link" to={`/roadmap?lesson=${item.lesson.id}`}>{item.title}</Link> : item.title}</h3><p>{item.durationMinutes} phút · +{item.xpReward} XP · {item.lesson?.skill ?? 'External'}</p></div>
      <div className="inline-actions">{!item.startedAt && !item.completedAt && <button onClick={() => start.mutate(item.id)}>Bắt đầu</button>}
      {!item.completedAt && !item.externalResource && <button onClick={() => complete.mutate(item.id)}>Hoàn thành</button>}
      {item.externalResource && <a className="small-link" href={item.externalResource.url} target="_blank" rel="noreferrer">Mở nguồn</a>}
      {item.completedAt && <span>Đã xong</span>}</div></article>)}</div>
    {assignment.status === 'COMPLETED' && <div className="victory-box"><h3>Bạn đã chiến thắng hôm nay!</h3><p>Chuỗi học và XP đã được cập nhật. Hãy mở AI Coach để chuẩn bị ngày mai.</p></div>}
  </section>;
}
