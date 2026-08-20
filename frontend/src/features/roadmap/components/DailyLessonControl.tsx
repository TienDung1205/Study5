import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Pause, PlayCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const requiredSeconds = Math.ceil(item.durationMinutes * 60 * 0.5);
  const enoughTime = trackedSeconds >= requiredSeconds;
  const activityCount = item.lesson?.contentData?.activities.length ?? 0;
  const questionCount = item.lesson?.contentData?.practice.questions.length ?? 0;
  const learningStepsReady = (lessonProgress.data?.completedActivityIndexes.length ?? 0) >= activityCount
    && (questionCount === 0 || Boolean(lessonProgress.data?.latestPracticeAttempt));

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
    <div className="daily-control-heading"><div><span>BÀI ĐƯỢC GIAO HÔM NAY</span><h3>{item.completedAt ? 'Đã hoàn thành' : 'Học bài này để giữ đúng tiến độ'}</h3></div><div className="daily-deadline"><Clock3 size={16} /> {new Date(assignment.dueAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div></div>
    <p>Yêu cầu: học tối thiểu {Math.ceil(requiredSeconds / 60)} phút, hoàn thành {activityCount} bước và nộp mini practice · Đã học {Math.floor(trackedSeconds / 60)} phút · +{item.xpReward} XP</p>
    {activeSession && <Countdown startedAt={activeSession.startedAt} remainingBeforeSession={Math.max(0, requiredSeconds - trackedSeconds)} isStopping={finish.isPending} onComplete={() => finish.mutate(activeSession)} />}
    {(start.error || finish.error || complete.error) && <p className="form-error">{start.error?.message ?? finish.error?.message ?? complete.error?.message}</p>}
    <div className="daily-control-actions">
      {!item.completedAt && !enoughTime && !activeSession && <button type="button" disabled={start.isPending} onClick={() => start.mutate()}><PlayCircle size={17} /> {item.startedAt ? 'Tiếp tục học' : 'Bắt đầu học'}</button>}
      {activeSession && <button type="button" className="secondary-action" disabled={finish.isPending} onClick={() => finish.mutate(activeSession)}><Pause size={17} /> Tạm dừng</button>}
      {!item.completedAt && enoughTime && <button type="button" disabled={complete.isPending || !learningStepsReady} title={!learningStepsReady ? 'Hoàn thành checklist và nộp mini practice trước' : undefined} onClick={() => complete.mutate()}><Check size={17} /> {learningStepsReady ? 'Hoàn thành bài' : 'Chưa đủ hoạt động'}</button>}
      {item.completedAt && <span className="daily-completed"><Check size={17} /> XP và tiến độ đã được cập nhật</span>}
    </div>
  </section>;
}

function Countdown({ startedAt, remainingBeforeSession, isStopping, onComplete }: { startedAt: number; remainingBeforeSession: number; isStopping: boolean; onComplete: () => void }) {
  const [remainingSeconds, setRemainingSeconds] = useState(remainingBeforeSession);
  const completionSent = useRef(false);

  useEffect(() => {
    const update = () => {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const nextRemaining = Math.max(0, remainingBeforeSession - elapsedSeconds);
      setRemainingSeconds(nextRemaining);
      if (nextRemaining === 0 && !completionSent.current) {
        completionSent.current = true;
        onComplete();
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [onComplete, remainingBeforeSession, startedAt]);

  const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
  const progress = remainingBeforeSession ? ((remainingBeforeSession - remainingSeconds) / remainingBeforeSession) * 100 : 100;
  return <div className="study-countdown"><div><span>THỜI GIAN TỐI THIỂU CÒN LẠI</span><strong>{isStopping ? 'Đang lưu...' : `${minutes}:${seconds}`}</strong></div><div className="countdown-track"><i style={{ width: `${Math.min(100, progress)}%` }} /></div><small>Tạm dừng bất cứ lúc nào; thời gian đã học được cộng dồn.</small></div>;
}
