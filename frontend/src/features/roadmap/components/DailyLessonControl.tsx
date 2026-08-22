import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Pause, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ToastMessage } from '../../../components/feedback/ToastProvider';
import { getJson, patchJson, postJson } from '../../../services/api-client';
import type { AssignmentItem, DailyAssignment, LessonLearningProgress } from '../../../types/domain';

interface ActiveSession {
  sessionId: string;
  startedAt: number;
}

export function DailyLessonControl({ assignment, item }: { assignment: DailyAssignment; item: AssignmentItem }) {
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const lessonProgress = useQuery({
    queryKey: ['lesson-progress', item.lesson?.id],
    queryFn: () => getJson<LessonLearningProgress>(`/learning/lessons/${item.lesson!.id}/progress`),
    enabled: Boolean(item.lesson?.id),
  });
  const trackedSeconds = item.studySessions?.reduce((sum, session) => sum + session.durationSeconds, 0) ?? 0;
  const activityCount = item.lesson?.contentData?.activities.length ?? 0;
  const questionCount = item.lesson?.contentData?.practice.questions.length ?? 0;
  const learningStepsReady = (lessonProgress.data?.completedActivityIndexes.length ?? 0) >= activityCount
    && (questionCount === 0 || (lessonProgress.data?.latestPracticeAttempt?.accuracy ?? 0) >= 0.6);

  const refreshLearningData = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['today'] }),
    queryClient.invalidateQueries({ queryKey: ['roadmap'] }),
    queryClient.invalidateQueries({ queryKey: ['profile'] }),
    queryClient.invalidateQueries({ queryKey: ['weekly-report'] }),
  ]);
  const start = useMutation({
    mutationFn: async () => {
      await postJson(`/assignments/items/${item.id}/start`);
      const session = await postJson<{ id: string; startedAt: string }>('/assignments/study-sessions', { assignmentItemId: item.id });
      return { sessionId: session.id, startedAt: new Date(session.startedAt).getTime() };
    },
    onSuccess: setActiveSession,
  });
  const finish = useMutation({
    mutationFn: (session: ActiveSession) => patchJson(`/assignments/study-sessions/${session.sessionId}/finish`, {
      durationSeconds: Math.min(86_400, Math.max(1, Math.round((Date.now() - session.startedAt) / 1000))),
    }),
    onSuccess: async () => {
      setActiveSession(null);
      await refreshLearningData();
    },
  });
  const complete = useMutation({
    mutationFn: () => postJson(`/assignments/items/${item.id}/complete`),
    onSuccess: refreshLearningData,
  });

  return <section className={`daily-lesson-control${item.completedAt ? ' completed' : ''}`}>
    <div className="daily-control-heading"><div><span>BÀI ĐANG HỌC TRONG LỘ TRÌNH</span><h3>{item.completedAt ? 'Đã hoàn thành' : 'Học bài này để giữ đúng tiến độ'}</h3></div><div className="daily-deadline"><Clock3 size={16} /> {new Date(assignment.dueAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div></div>
    <p>Thời lượng tham khảo {item.durationMinutes} phút · Hoàn thành {activityCount} bước và mini practice đạt ít nhất 60% · Đã ghi nhận {formatStudyDuration(trackedSeconds)} · +{item.xpReward} XP</p>
    {activeSession && <CountUpTimer startedAt={activeSession.startedAt} trackedBeforeSession={trackedSeconds} isStopping={finish.isPending} />}
    {(start.error || finish.error || complete.error) && <ToastMessage variant="error">{start.error?.message ?? finish.error?.message ?? complete.error?.message}</ToastMessage>}
    <div className="daily-control-actions">
      {!item.completedAt && !activeSession && <button type="button" disabled={start.isPending} onClick={() => start.mutate()}><PlayCircle size={17} /> {item.startedAt ? 'Tiếp tục học' : 'Bắt đầu học'}</button>}
      {activeSession && <button type="button" className="secondary-action" disabled={finish.isPending} onClick={() => finish.mutate(activeSession)}><Pause size={17} /> Tạm dừng</button>}
      {!item.completedAt && !activeSession && <button type="button" disabled={complete.isPending || !learningStepsReady} title={!learningStepsReady ? 'Hoàn thành checklist và đạt ít nhất 60% mini practice trước' : undefined} onClick={() => complete.mutate()}><Check size={17} /> {learningStepsReady ? 'Hoàn thành bài' : 'Chưa đạt điều kiện'}</button>}
      {item.completedAt && <span className="daily-completed"><Check size={17} /> XP và tiến độ đã được cập nhật</span>}
    </div>
  </section>;
}

function CountUpTimer({ startedAt, trackedBeforeSession, isStopping }: { startedAt: number; trackedBeforeSession: number; isStopping: boolean }) {
  const [totalSeconds, setTotalSeconds] = useState(trackedBeforeSession);

  useEffect(() => {
    const update = () => {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setTotalSeconds(trackedBeforeSession + elapsedSeconds);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, trackedBeforeSession]);

  return <div className="study-countdown count-up"><div><span>THỜI GIAN ĐÃ HỌC</span><strong>{isStopping ? 'Đang lưu...' : formatStudyDuration(totalSeconds, true)}</strong></div><small>Đồng hồ đếm tăng và chỉ dừng khi bạn bấm Tạm dừng. Không giới hạn thời gian học.</small></div>;
}

function formatStudyDuration(totalSeconds: number, showSeconds = false): string {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (showSeconds) return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;
}
