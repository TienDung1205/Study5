import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpenCheck, Check, Circle, Headphones, RotateCcw, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getJson, patchJson, postJson } from '../../../services/api-client';
import type { Lesson, LessonContentData, LessonLearningProgress, MiniPracticeAttempt } from '../../../types/domain';
import { useAuthStore } from '../../auth/auth.store';

export function InteractiveLessonPractice({ lesson, data }: { lesson: Lesson; data: LessonContentData }) {
  const user = useAuthStore((state) => state.user);
  const isLearner = user?.role === 'LEARNER';
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['lesson-progress', lesson.id],
    queryFn: () => getJson<LessonLearningProgress>(`/learning/lessons/${lesson.id}/progress`),
    enabled: isLearner,
  });
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(() => data.practice.questions.map(() => -1));
  const [visibleAttempt, setVisibleAttempt] = useState<MiniPracticeAttempt | null>(null);
  const [previewCompletedIndexes, setPreviewCompletedIndexes] = useState<number[]>([]);

  useEffect(() => {
    const storedAttempt = progress.data?.latestPracticeAttempt ?? null;
    setVisibleAttempt(storedAttempt);
    setSelectedAnswers(storedAttempt?.selectedAnswers ?? data.practice.questions.map(() => -1));
    setPreviewCompletedIndexes([]);
  }, [data.practice.questions, lesson.id, progress.data?.latestPracticeAttempt]);

  const activityMutation = useMutation({
    mutationFn: ({ activityIndex, completed }: { activityIndex: number; completed: boolean }) =>
      patchJson<LessonLearningProgress>(`/learning/lessons/${lesson.id}/activities/${activityIndex}`, { completed }),
    onSuccess: (nextProgress) => {
      queryClient.setQueryData(['lesson-progress', lesson.id], nextProgress);
      void queryClient.invalidateQueries({ queryKey: ['weekly-report'] });
    },
  });
  const practiceMutation = useMutation({
    mutationFn: () => postJson<MiniPracticeAttempt>(`/learning/lessons/${lesson.id}/practice-attempts`, { selectedAnswers }),
    onSuccess: (attempt) => {
      setVisibleAttempt(attempt);
      queryClient.setQueryData<LessonLearningProgress>(['lesson-progress', lesson.id], (current) => ({
        completedActivityIndexes: current?.completedActivityIndexes ?? [],
        latestPracticeAttempt: attempt,
      }));
      void queryClient.invalidateQueries({ queryKey: ['weekly-report'] });
      void queryClient.invalidateQueries({ queryKey: ['ai-latest'] });
    },
  });

  const completedIndexes = new Set(isLearner ? (progress.data?.completedActivityIndexes ?? []) : previewCompletedIndexes);
  const allAnswered = selectedAnswers.every((answer) => answer >= 0);
  const resultByQuestion = new Map(visibleAttempt?.resultDetails.map((result) => [result.questionIndex, result]) ?? []);
  const toggleActivity = (activityIndex: number, completed: boolean) => {
    if (isLearner) {
      activityMutation.mutate({ activityIndex, completed: !completed });
      return;
    }
    setPreviewCompletedIndexes((indexes) => completed
      ? indexes.filter((index) => index !== activityIndex)
      : [...indexes, activityIndex]);
  };
  const submitPractice = () => {
    if (isLearner) {
      practiceMutation.mutate();
      return;
    }
    const resultDetails = data.practice.questions.map((question, questionIndex) => ({
      questionIndex,
      selectedOptionIndex: selectedAnswers[questionIndex],
      correctOptionIndex: question.correctOptionIndex,
      correct: selectedAnswers[questionIndex] === question.correctOptionIndex,
      explanation: question.explanation,
    }));
    const correctAnswers = resultDetails.filter((result) => result.correct).length;
    setVisibleAttempt({
      id: 'admin-preview',
      selectedAnswers,
      correctAnswers,
      totalQuestions: resultDetails.length,
      accuracy: correctAnswers / resultDetails.length,
      resultDetails,
      submittedAt: new Date().toISOString(),
    });
  };
  const resetPractice = () => {
    setVisibleAttempt(null);
    setSelectedAnswers(data.practice.questions.map(() => -1));
  };

  return <>
    <section className="lesson-block interactive-plan"><div className="lesson-block-title"><span className="block-number">03</span><div><small>LÀM THEO THỨ TỰ · {isLearner ? 'CÓ LƯU TIẾN ĐỘ' : 'ADMIN MÔ PHỎNG'}</small><h3>Kế hoạch {lesson.durationMinutes} phút</h3></div></div>
      <div className="activity-progress-line"><strong>{completedIndexes.size}/{data.activities.length} bước đã xong</strong><span>{isLearner ? 'Tích từng bước sau khi thực hiện thật.' : 'Bấm thử để kiểm tra giao diện; kết quả không được lưu.'}</span></div>
      <div className="activity-list">{data.activities.map((activity, activityIndex) => {
        const completed = completedIndexes.has(activityIndex);
        return <article className={completed ? 'activity-completed' : ''} key={`${activity.title}-${activityIndex}`}><span>{activity.minutes}'</span><div><strong>{activity.title}</strong>{activity.instructions.map((instruction) => <p key={instruction}>{instruction}</p>)}</div>
          <button type="button" className="activity-check" disabled={activityMutation.isPending} onClick={() => toggleActivity(activityIndex, completed)}>{completed ? <Check size={18} /> : <Circle size={18} />}{completed ? 'Đã làm' : 'Đánh dấu xong'}</button></article>;
      })}</div>
      {activityMutation.error && <p className="form-error">{activityMutation.error.message}</p>}
    </section>

    <section className="lesson-block practice-block"><div className="lesson-block-title">{data.practice.kind === 'LISTENING' ? <Headphones size={20} /> : <BookOpenCheck size={20} />}<div><small>04 · MINI PRACTICE CÓ CHẤM KẾT QUẢ</small><h3>{data.practice.title}</h3></div></div>
      {data.practice.kind === 'LISTENING'
        ? <><audio className="lesson-audio" controls preload="metadata"><source src={data.practice.audioUrl} type="audio/wav" />Trình duyệt của bạn không hỗ trợ phát audio.</audio><details className="practice-transcript"><summary>Mở transcript sau khi đã nghe ít nhất 2 lần</summary><p lang="en">{data.practice.material}</p></details></>
        : <p className="practice-material" lang="en">{data.practice.material}</p>}
      <div className="interactive-questions">{data.practice.questions.map((question, questionIndex) => {
        const result = resultByQuestion.get(questionIndex);
        return <fieldset className={result ? (result.correct ? 'question-correct' : 'question-wrong') : ''} key={`${question.prompt}-${questionIndex}`}><legend>{questionIndex + 1}. {question.prompt}</legend>
          <div className="answer-options">{question.options.map((option, optionIndex) => {
            const selected = selectedAnswers[questionIndex] === optionIndex;
            const correctAfterSubmit = Boolean(result) && result?.correctOptionIndex === optionIndex;
            const wrongAfterSubmit = Boolean(result) && selected && !result?.correct;
            return <button type="button" className={`${selected ? 'selected ' : ''}${correctAfterSubmit ? 'correct ' : ''}${wrongAfterSubmit ? 'wrong' : ''}`} disabled={Boolean(visibleAttempt)} key={option} onClick={() => setSelectedAnswers((answers) => answers.map((answer, index) => index === questionIndex ? optionIndex : answer))}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{correctAfterSubmit && <Check size={16} />}{wrongAfterSubmit && <X size={16} />}</button>;
          })}</div>
          {result && <p className="answer-explanation"><strong>Giải thích:</strong> {result.explanation}</p>}
        </fieldset>;
      })}</div>
      {visibleAttempt ? <div className="practice-result"><div><strong>{visibleAttempt.correctAnswers}/{visibleAttempt.totalQuestions} câu đúng · {Math.round(visibleAttempt.accuracy * 100)}%</strong><span>{isLearner ? 'Kết quả đã lưu vào Tiến độ & thống kê.' : 'Kết quả mô phỏng của admin, không lưu vào thống kê.'}</span></div><button type="button" onClick={resetPractice}><RotateCcw size={16} /> Làm lại</button></div>
        : <button type="button" className="submit-practice" disabled={!allAnswered || practiceMutation.isPending} onClick={submitPractice}><Send size={16} /> {practiceMutation.isPending ? 'Đang chấm...' : isLearner ? 'Nộp mini practice' : 'Chấm thử'}</button>}
      {practiceMutation.error && <p className="form-error">{practiceMutation.error.message}</p>}
    </section>
  </>;
}
