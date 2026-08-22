import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastMessage } from '../../../components/feedback/ToastProvider';
import { getJson, postJson } from '../../../services/api-client';
import type { AiRecommendation, DailyAssignment, PlanType } from '../../../types/domain';

const typeMap: Record<string, PlanType> = { recovery: 'RECOVERY', standard: 'STANDARD', accelerated: 'ACCELERATED' };
export function AiCoachPage() {
  const queryClient = useQueryClient(); const [mood, setMood] = useState('normal'); const [minutes, setMinutes] = useState(60);
  const latest = useQuery({ queryKey: ['ai-latest'], queryFn: () => getJson<AiRecommendation | null>('/ai-coach/recommendations/latest') });
  const analyze = useMutation({ mutationFn: () => postJson<AiRecommendation>('/ai-coach/daily-analysis', { mood, tomorrowAvailableMinutes: minutes }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-latest'] }) });
  const select = useMutation({ mutationFn: ({ id, planType }: { id: string; planType: PlanType }) => postJson<DailyAssignment>(`/ai-coach/recommendations/${id}/select`, { planType }), onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['today'] }), queryClient.invalidateQueries({ queryKey: ['recent-assignments'] })]) });
  const recommendation = analyze.data ?? latest.data;
  return <section><header className="page-header"><div><p className="eyebrow">AI DAILY COACH</p><h2>Chuẩn bị ngày mai</h2>
    <p className="muted">Không có API key hệ thống sẽ dùng rule engine an toàn.</p></div></header>
    <div className="coach-controls"><label>Tâm trạng<select value={mood} onChange={(e) => setMood(e.target.value)}><option value="great">Rất tốt</option><option value="normal">Bình thường</option><option value="tired">Mệt</option></select></label>
      <label>Thời gian ngày mai<input type="number" min={20} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
      <button className="primary-button" onClick={() => analyze.mutate()} disabled={analyze.isPending}>{analyze.isPending ? 'Đang phân tích...' : 'Phân tích hôm nay'}</button></div>
    {analyze.error && <ToastMessage variant="error">{analyze.error.message}</ToastMessage>}
    {select.isSuccess && <ToastMessage variant="success">Đã áp dụng cho ngày học {new Date(select.data.scheduledDate).toLocaleDateString('vi-VN')}.</ToastMessage>}
    {select.error && <ToastMessage variant="error">{select.error.message}</ToastMessage>}
    {recommendation ? <><div className="coach-insight"><strong>Nhận xét hôm nay</strong><p>{recommendation.analysis.reason}</p>
      <small>Điểm mạnh: {recommendation.analysis.strength} · Cần chú ý: {recommendation.analysis.weakness} · Nguồn: {recommendation.provider}</small></div>
      <div className="plan-grid">{recommendation.planOptions.map((plan) => <article className={`plan-card${plan.recommended ? ' recommended' : ''}`} key={plan.type}>
        {plan.recommended && <span className="recommended-label">Khuyên chọn</span>}<h3>{plan.title}</h3><strong>{plan.totalMinutes} phút</strong>
        <p>{plan.lessonIds.length} nội dung được chọn từ Phase hiện tại.</p><button onClick={() => select.mutate({ id: recommendation.id, planType: typeMap[plan.type] })}>Chọn kế hoạch</button></article>)}</div></>
      : <div className="empty-state">Chưa có phân tích. Hoàn thành nhiệm vụ hôm nay rồi tạo kế hoạch.</div>}
  </section>;
}
