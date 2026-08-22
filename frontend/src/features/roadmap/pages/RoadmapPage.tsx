import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, ChevronRight, Clock3, ExternalLink, LockKeyhole, PlayCircle, RotateCcw, Trophy } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ToastMessage } from '../../../components/feedback/ToastProvider';
import { APP_NAME } from '../../../config/app';
import { getJson, postJson } from '../../../services/api-client';
import type { AssignmentItem, DailyAssignment, Lesson, Roadmap } from '../../../types/domain';
import { useAuthStore } from '../../auth/auth.store';
import { DailyLessonControl } from '../components/DailyLessonControl';
import { FlashcardDeck } from '../components/FlashcardDeck';
import { InteractiveLessonPractice } from '../components/InteractiveLessonPractice';

export function RoadmapPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const roadmap = useQuery({ queryKey: ['roadmap'], queryFn: () => getJson<Roadmap>('/content/roadmap') });
  const today = useQuery({
    queryKey: ['today'],
    queryFn: () => getJson<DailyAssignment>('/assignments/today'),
    enabled: user?.role === 'LEARNER' && Boolean(roadmap.data) && !roadmap.data?.goalAchievedAt,
  });
  const studyNow = useMutation({
    mutationFn: (lessonId: string) => postJson<DailyAssignment>(`/assignments/lessons/${lessonId}/study-now`),
    onSuccess: async (assignment) => {
      queryClient.setQueryData(['today'], assignment);
      await queryClient.invalidateQueries({ queryKey: ['roadmap'] });
    },
  });

  if (roadmap.isPending) return <div className="empty-state">Đang tải lộ trình...</div>;
  if (roadmap.isError) return <div className="error-state">{roadmap.error.message}</div>;

  const catalogLessonCount = roadmap.data.phases.reduce((sum, phase) => sum + phase.lessons.length, 0);
  const plannedPhases = roadmap.data.phases.filter((phase) => !phase.skipped);
  const plannedLessonCount = plannedPhases.reduce((sum, phase) => sum + phase.lessons.length, 0);
  const completedLessons = plannedPhases.reduce((sum, phase) => sum + phase.completedLessons, 0);
  const progress = plannedLessonCount ? Math.round((completedLessons / plannedLessonCount) * 100) : 0;
  const dailyLessonItems = today.data?.items.filter((item) => item.lesson) ?? [];
  const completedDailyItems = today.data?.items.filter((item) => item.completedAt).length ?? 0;
  const selectedLessonId = searchParams.get('lesson');
  const selectedLesson = roadmap.data.phases
    .flatMap((phase) => phase.lessons)
    .find((lesson) => lesson.id === selectedLessonId);
  const selectedDailyItem = today.data?.items.find((item) => item.lesson?.id === selectedLesson?.id);
  const orderedLessons = roadmap.data.phases.flatMap((phase) => phase.lessons);
  const selectedLessonIndex = orderedLessons.findIndex((lesson) => lesson.id === selectedLesson?.id);
  const previousLesson = selectedLessonIndex > 0 ? orderedLessons[selectedLessonIndex - 1] : undefined;
  const nextLesson = selectedLessonIndex >= 0 ? orderedLessons[selectedLessonIndex + 1] : undefined;
  const canOpen = (lesson?: Lesson) => Boolean(lesson && (user?.role === 'ADMIN' || lesson.completed || lesson.unlocked));
  const openLesson = (lessonId: string) => {
    setSearchParams({ lesson: lessonId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (selectedLesson) {
    const isReplay = user?.role === 'LEARNER' && selectedLesson.completed && !selectedDailyItem;
    const needsAssignment = user?.role === 'LEARNER' && !selectedLesson.completed && !selectedDailyItem;
    return <section className="today-learning-page roadmap-learning-view">
      <header className="page-header today-header"><div><button type="button" className="back-to-roadmap roadmap-back-button" onClick={() => setSearchParams({})}><ArrowLeft size={16} /> Quay lại danh sách lộ trình</button><p className="eyebrow">{user?.role === 'ADMIN' ? 'CHẾ ĐỘ QUẢN TRỊ · HỌC THỬ TOÀN BỘ' : selectedDailyItem ? 'BÀI ĐANG HỌC TRONG LỘ TRÌNH' : isReplay ? 'HỌC LẠI BÀI ĐÃ HOÀN THÀNH' : 'BÀI ĐÃ ĐƯỢC MỞ TRONG LỘ TRÌNH'}</p><h2>{user?.role === 'ADMIN' ? 'Học thử trong lộ trình' : 'Học trong lộ trình'}</h2><p className="muted">Giao diện học thống nhất của Study7. Tiến độ chỉ được cộng khi học viên hoàn thành đúng điều kiện bài học.</p></div></header>
      <LessonSequenceNavigation previousLesson={previousLesson} nextLesson={nextLesson} canOpen={canOpen} onOpenLesson={openLesson} />
      {isReplay && <div className="lesson-replay-banner"><RotateCcw size={19} /><div><strong>Chế độ học lại</strong><p>Bạn có thể học lại flashcard và mini practice; XP và lần hoàn thành cũ được giữ nguyên.</p></div></div>}
      {needsAssignment && <div className="lesson-start-banner"><PlayCircle size={20} /><div><strong>Bài này đã được mở</strong><p>Thêm bài vào lịch hôm nay để bật đồng hồ, điều kiện hoàn thành và XP.</p></div><button type="button" disabled={studyNow.isPending} onClick={() => studyNow.mutate(selectedLesson.id)}>{studyNow.isPending ? 'Đang chuẩn bị...' : 'Bắt đầu học bài này'}</button></div>}
      {studyNow.error && <ToastMessage variant="error">{studyNow.error.message}</ToastMessage>}
      <div className="today-lesson-shell"><LessonContent lesson={selectedLesson} assignment={today.data} dailyItem={selectedDailyItem} targetScore={roadmap.data.targetScore} /></div>
      <LessonSequenceNavigation bottom previousLesson={previousLesson} nextLesson={nextLesson} canOpen={canOpen} onOpenLesson={openLesson} />
    </section>;
  }

  return <section className="course-page">
    <header className="course-header"><div><p className="eyebrow">LỘ TRÌNH {roadmap.data.durationWeeks} TUẦN · {roadmap.data.studyDaysPerWeek} NGÀY/TUẦN</p><h2>{roadmap.data.title}</h2><p className="muted">{roadmap.data.description} Chọn một bài để mở giao diện học.</p></div>
      <div className="course-total-progress"><strong>{progress}%</strong><span>{completedLessons}/{plannedLessonCount} ngày học</span><div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div></div></header>
    {today.data && <section className="roadmap-daily-summary">
      <div><small>BÀI ĐANG CẦN HOÀN THÀNH</small><strong>{completedDailyItems}/{today.data.items.length} nội dung đã hoàn thành</strong><span>Deadline {new Date(today.data.dueAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span></div>
      <div className="roadmap-daily-links">{dailyLessonItems.map((item) => <button type="button" key={item.id} onClick={() => openLesson(item.lesson!.id)}>{item.completedAt ? <Check size={15} /> : <PlayCircle size={15} />}{item.lesson?.title}</button>)}</div>
    </section>}
    {today.isError && user?.role === 'LEARNER' && !roadmap.data.goalAchievedAt && <ToastMessage variant="error">Không tải được bài giao hôm nay: {today.error.message}</ToastMessage>}
    <div className="course-player roadmap-catalog">
      <aside className="curriculum-panel"><div className="curriculum-title"><strong>Danh sách bài học trong lộ trình</strong><span>{roadmap.data.phases.length} chặng · {catalogLessonCount} bài</span></div>
        {roadmap.data.phases.map((phase) => {
          const active = roadmap.data.currentPhaseId === phase.id;
          const canExpand = user?.role === 'ADMIN' || phase.unlocked || phase.completedLessons > 0;
          const phaseProgress = phase.lessons.length ? Math.round((phase.completedLessons / phase.lessons.length) * 100) : 0;
          return <details key={phase.id} open={user?.role === 'ADMIN' || active} className="curriculum-phase">
            <summary><span><small>PHASE {phase.position}</small><strong>{phase.title}</strong><em>{user?.role === 'ADMIN' ? `${phase.lessons.length} bài · quyền xem toàn bộ` : phase.skipped ? 'Có thể xem lại · đã bỏ qua theo điểm đầu vào' : phase.unlocked ? `${phase.completedLessons}/${phase.lessons.length} bài · ${phaseProgress}%${phase.masteryAccuracy !== null ? ` · Mastery ${Math.round(phase.masteryAccuracy * 100)}%` : ''}` : 'Hoàn thành Phase trước để mở'}</em></span>{canExpand ? <ChevronRight size={18} /> : <LockKeyhole size={17} />}</summary>
            <div className="curriculum-lessons">{phase.lessons.map((lesson) => {
              const canOpenLesson = user?.role === 'ADMIN' || lesson.completed || lesson.unlocked;
              const lessonStatus = user?.role === 'ADMIN' ? 'Học thử' : lesson.completed ? 'Học lại' : lesson.unlocked ? 'Có thể học' : 'Chưa mở';
              return <button type="button" disabled={!canOpenLesson} className={dailyLessonItems.some((item) => item.lesson?.id === lesson.id) ? 'today' : ''} key={lesson.id} onClick={() => openLesson(lesson.id)}>
                <span className={`lesson-state${lesson.completed ? ' done' : ''}`}>{lesson.completed ? <Check size={13} /> : canOpenLesson ? <PlayCircle size={14} /> : <LockKeyhole size={13} />}</span>
                <span><strong>{lesson.title}</strong><small>{lesson.durationMinutes} phút · {skillLabel(lesson.skill)} · {lessonStatus}{dailyLessonItems.some((item) => item.lesson?.id === lesson.id) ? ' · Hôm nay' : ''}</small></span></button>;
            })}</div>
          </details>;
        })}
      </aside>
    </div>
  </section>;
}

interface LessonSequenceNavigationProps {
  bottom?: boolean;
  canOpen: (lesson?: Lesson) => boolean;
  nextLesson?: Lesson;
  onOpenLesson: (lessonId: string) => void;
  previousLesson?: Lesson;
}

function LessonSequenceNavigation({ bottom, canOpen, nextLesson, onOpenLesson, previousLesson }: LessonSequenceNavigationProps) {
  return <nav className={`lesson-sequence-navigation${bottom ? ' bottom' : ''}`} aria-label={bottom ? 'Điều hướng cuối bài' : 'Điều hướng bài học'}>
    <button type="button" disabled={!canOpen(previousLesson)} onClick={() => previousLesson && onOpenLesson(previousLesson.id)}>
      <ArrowLeft size={17} />
      {previousLesson && <span>{previousLesson.title}</span>}
    </button>
    <button type="button" disabled={!canOpen(nextLesson)} onClick={() => nextLesson && onOpenLesson(nextLesson.id)}>
      {nextLesson && <span>{nextLesson.title}</span>}
      <ArrowRight size={17} />
    </button>
  </nav>;
}

export function LessonContent({ lesson, assignment, dailyItem, targetScore }: { lesson?: Lesson; assignment?: DailyAssignment; dailyItem?: AssignmentItem; targetScore?: number }) {
  if (!lesson) return <article className="lesson-content"><div className="empty-state">Chưa có bài học trong chặng này.</div></article>;
  const data = lesson.contentData;
  const lines = lesson.content?.split('\n') ?? [];
  return <article className="lesson-content">
    <div className="lesson-breadcrumb">LỘ TRÌNH TOEIC {targetScore ?? ''} <ChevronRight size={14} /> NGÀY {getLessonDayNumber(lesson)}</div>
    <h1>{lesson.title}</h1><p className="lesson-description">{lesson.description}</p>
    <div className="lesson-meta"><span><Clock3 size={16} /> {lesson.durationMinutes} phút</span><span>+{lesson.xpReward} XP</span><span>{skillLabel(lesson.skill)}</span></div>
    {assignment && dailyItem && <DailyLessonControl assignment={assignment} item={dailyItem} />}
    {data ? <div className="structured-lesson">
      <section className="lesson-objective"><span><Trophy size={20} /></span><div><small>MỤC TIÊU HÔM NAY</small><strong>{data.objective}</strong></div></section>

      <section className="lesson-block"><div className="lesson-block-title"><BookOpenCheck size={20} /><div><small>01</small><h3>Kiến thức trọng tâm</h3></div></div>
        <ul className="theory-list">{data.theory.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className="lesson-block"><div className="lesson-block-title"><span className="block-number">02</span><div><small>TỪ VỰNG · {data.vocabularyTopic}</small><h3>{dailyItem ? `${assignment?.newWordsLimit ?? 10} từ mới + từ đến hạn ôn` : `${data.vocabulary.length} từ trong bài`}</h3></div></div>
        <FlashcardDeck cards={data.vocabulary} assignmentId={dailyItem ? assignment?.id : undefined} />
      </section>

      <InteractiveLessonPractice lesson={lesson} data={data} />

      <section className="lesson-block success-criteria"><div className="lesson-block-title"><Check size={20} /><div><small>05</small><h3>Điều kiện chiến thắng</h3></div></div>
        {data.successCriteria.map((criterion) => <p key={criterion}><Check size={15} /> {criterion}</p>)}
      </section>
    </div> : <div className="lesson-guide">{lines.map((line, index) => {
      if (!line) return <div className="content-spacer" key={index} />;
      if (line === line.toUpperCase() && !line.startsWith('-')) return <h3 key={index}>{line}</h3>;
      return <p className={/^\d+\.|^-/.test(line) ? 'instruction-line' : ''} key={index}>{line}</p>;
    })}</div>}
    {lesson.contentUrl && <a className="external-practice-button" href={lesson.contentUrl} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Làm bài checkpoint ở nguồn ngoài</a>}
    <div className="source-note">{data?.sourceNote ?? `${APP_NAME} quản lý lộ trình, thời gian và kết quả học tập.`}</div>
  </article>;
}

function skillLabel(skill: string): string {
  return ({ VOCABULARY: 'Từ vựng', GRAMMAR: 'Ngữ pháp', LISTENING: 'Listening', READING: 'Reading', REVIEW: 'Checkpoint', HABIT: 'Thói quen' } as Record<string, string>)[skill] ?? skill;
}

function getLessonDayNumber(lesson: Lesson): number {
  const matchedDay = lesson.title.match(/^Ngày\s+(\d+)/i)?.[1];
  return matchedDay ? Number(matchedDay) : lesson.position;
}
