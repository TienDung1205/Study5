import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { getJson, postJson } from '../../../services/api-client';
import type { DailyAssignment, ExternalResource } from '../../../types/domain';

interface Submission { id: string; totalScore?: number; submittedAt: string; resource: ExternalResource; assignmentItem: { title: string } }
export function ExternalPage() {
  const queryClient = useQueryClient();
  const resources = useQuery({ queryKey: ['external-resources'], queryFn: () => getJson<ExternalResource[]>('/external/resources') });
  const history = useQuery({ queryKey: ['external-history'], queryFn: () => getJson<Submission[]>('/external/submissions') });
  const today = useQuery({ queryKey: ['today'], queryFn: () => getJson<DailyAssignment>('/assignments/today') });
  const externalItem = today.data?.items.find((item) => item.externalResource && !item.completedAt);
  const [listeningScore, setListeningScore] = useState(''); const [readingScore, setReadingScore] = useState('');
  const [toeicPart, setToeicPart] = useState('FULL_TEST'); const [correctAnswers, setCorrectAnswers] = useState(''); const [totalQuestions, setTotalQuestions] = useState('');
  const [minutes, setMinutes] = useState(''); const [weakParts, setWeakParts] = useState('Part 7'); const [note, setNote] = useState('');
  const submitResult = useMutation({
    mutationFn: () => postJson('/external/submissions', {
      assignmentItemId: externalItem?.id, resourceId: externalItem?.externalResource?.id,
      listeningScore: listeningScore ? Number(listeningScore) : undefined, readingScore: readingScore ? Number(readingScore) : undefined,
      toeicPart, correctAnswers: correctAnswers ? Number(correctAnswers) : undefined, totalQuestions: totalQuestions ? Number(totalQuestions) : undefined,
      completionMinutes: minutes ? Number(minutes) : undefined, weakParts: weakParts.split(',').map((value) => value.trim()).filter(Boolean), learnerNote: note || undefined,
    }),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['today'] }), queryClient.invalidateQueries({ queryKey: ['external-history'] })]),
  });
  const addToToday = useMutation({
    mutationFn: (resourceId: string) => postJson(`/external/resources/${resourceId}/add-to-today`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['today'] }),
  });
  function submit(event: FormEvent) { event.preventDefault(); submitResult.mutate(); }
  return <section><header className="page-header"><div><p className="eyebrow">HỌC NGOÀI HỆ THỐNG</p><h2>Nguồn luyện tập</h2><p className="muted">Làm bài ở nguồn ngoài rồi quay lại nhập kết quả.</p></div></header>
    <div className="resource-grid">{resources.data?.map((resource) => <article className="resource-card" key={resource.id}><h3>{resource.name}</h3><p>{resource.provider} · {resource.estimatedMinutes} phút</p><div className="inline-actions"><a href={resource.url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Mở website</a><button type="button" disabled={addToToday.isPending || Boolean(externalItem)} onClick={() => addToToday.mutate(resource.id)}>Giao hôm nay</button></div></article>)}</div>
    {addToToday.error && <p className="form-error">{addToToday.error.message}</p>}
    {externalItem ? <form className="submission-form" onSubmit={submit}><h3>Nộp kết quả: {externalItem.title}</h3>
      <label>Phạm vi<select value={toeicPart} onChange={(e) => setToeicPart(e.target.value)}><option value="FULL_TEST">Full test</option>{[1, 2, 3, 4, 5, 6, 7].map((part) => <option key={part} value={`PART_${part}`}>Part {part}</option>)}</select></label>
      <label>Số câu đúng<input type="number" min={0} max={200} value={correctAnswers} onChange={(e) => setCorrectAnswers(e.target.value)} /></label>
      <label>Tổng số câu<input type="number" min={1} max={200} value={totalQuestions} onChange={(e) => setTotalQuestions(e.target.value)} /></label>
      <label>Listening<input type="number" min={5} max={495} value={listeningScore} onChange={(e) => setListeningScore(e.target.value)} /></label>
      <label>Reading<input type="number" min={5} max={495} value={readingScore} onChange={(e) => setReadingScore(e.target.value)} /></label>
      <label>Số phút<input type="number" min={1} max={300} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
      <label>Part yếu<input value={weakParts} onChange={(e) => setWeakParts(e.target.value)} placeholder="Part 5, Part 7" /></label>
      <label className="full-field">Ghi chú<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
      {submitResult.error && <p className="form-error">{submitResult.error.message}</p>}<button className="primary-button">Nộp kết quả</button></form>
      : <div className="empty-state">Hôm nay chưa có nhiệm vụ bên ngoài cần nộp.</div>}
    <div className="table-card"><h3>Lịch sử kết quả</h3><div className="simple-table">{history.data?.map((item) => <div key={item.id}><span>{item.resource.provider}</span><strong>{item.totalScore ?? 'Không nhập điểm'}</strong><em>{new Date(item.submittedAt).toLocaleDateString('vi-VN')}</em></div>)}</div></div>
  </section>;
}
