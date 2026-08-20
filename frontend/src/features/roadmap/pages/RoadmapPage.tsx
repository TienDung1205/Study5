import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck, Check, ChevronRight, Clock3, ExternalLink, LockKeyhole, PlayCircle, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getJson } from '../../../services/api-client';
import type { AssignmentItem, DailyAssignment, Lesson, Roadmap } from '../../../types/domain';
import { useAuthStore } from '../../auth/auth.store';
import { DailyLessonControl } from '../components/DailyLessonControl';
import { FlashcardDeck } from '../components/FlashcardDeck';
import { InteractiveLessonPractice } from '../components/InteractiveLessonPractice';

export function RoadmapPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const roadmap = useQuery({ queryKey: ['roadmap'], queryFn: () => getJson<Roadmap>('/content/roadmap') });
  const today = useQuery({
    queryKey: ['today'],
    queryFn: () => getJson<DailyAssignment>('/assignments/today'),
    enabled: user?.role === 'LEARNER',
  });

  if (roadmap.isPending) return <div className="empty-state">Đang tải lộ trình...</div>;
  if (roadmap.isError) return <div className="error-state">{roadmap.error.message}</div>;

  const totalLessons = roadmap.data.phases.reduce((sum, phase) => sum + phase.lessons.length, 0);
  const completedLessons = roadmap.data.phases.reduce((sum, phase) => sum + phase.completedLessons, 0);
  const progress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const dailyLessonItems = today.data?.items.filter((item) => item.lesson) ?? [];
  const completedDailyItems = today.data?.items.filter((item) => item.completedAt).length ?? 0;

  return <section className="course-page">
    <header className="course-header"><div><p className="eyebrow">LỘ TRÌNH {roadmap.data.durationWeeks} TUẦN · 6 NGÀY/TUẦN</p><h2>{roadmap.data.title}</h2><p className="muted">Chọn một bài để chuyển sang màn hình học. {user?.role === 'ADMIN' ? 'Admin được xem toàn bộ nội dung của tất cả Phase.' : roadmap.data.description}</p></div>
      <div className="course-total-progress"><strong>{progress}%</strong><span>{completedLessons}/{totalLessons} ngày học</span><div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div></div></header>
    {today.data && <section className="roadmap-daily-summary">
      <div><small>BÀI CẦN HỌC HÔM NAY</small><strong>{completedDailyItems}/{today.data.items.length} nội dung đã hoàn thành</strong><span>Deadline {new Date(today.data.dueAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span></div>
      <div className="roadmap-daily-links">{dailyLessonItems.map((item) => <button type="button" key={item.id} onClick={() => navigate(`/today?lesson=${item.lesson!.id}&from=roadmap`)}>{item.completedAt ? <Check size={15} /> : <PlayCircle size={15} />}{item.lesson?.title}</button>)}</div>
    </section>}
    {today.isError && user?.role === 'LEARNER' && <div className="error-state">Không tải được bài giao hôm nay: {today.error.message}</div>}
    <div className="course-player roadmap-catalog">
      <aside className="curriculum-panel"><div className="curriculum-title"><strong>Nội dung khóa học</strong><span>{roadmap.data.phases.length} chặng</span></div>
        {roadmap.data.phases.map((phase) => {
          const active = roadmap.data.currentPhaseId === phase.id;
          const canOpen = user?.role === 'ADMIN' || phase.unlocked;
          const phaseProgress = phase.lessons.length ? Math.round((phase.completedLessons / phase.lessons.length) * 100) : 0;
          return <details key={phase.id} open={user?.role === 'ADMIN' || active} className="curriculum-phase">
            <summary><span><small>PHASE {phase.position}</small><strong>{phase.title}</strong><em>{user?.role === 'ADMIN' ? `${phase.lessons.length} bài · quyền xem toàn bộ` : phase.skipped ? 'Có thể xem lại · đã bỏ qua theo điểm đầu vào' : phase.unlocked ? `${phase.completedLessons}/${phase.lessons.length} bài · ${phaseProgress}%${phase.masteryAccuracy !== null ? ` · Mastery ${Math.round(phase.masteryAccuracy * 100)}%` : ''}` : 'Hoàn thành Phase trước để mở'}</em></span>{canOpen ? <ChevronRight size={18} /> : <LockKeyhole size={17} />}</summary>
            <div className="curriculum-lessons">{phase.lessons.map((lesson) => <button type="button" disabled={!canOpen} className={dailyLessonItems.some((item) => item.lesson?.id === lesson.id) ? 'selected' : ''} key={lesson.id} onClick={() => navigate(`/today?lesson=${lesson.id}&from=roadmap`)}>
              <span className={`lesson-state${lesson.completed ? ' done' : ''}`}>{lesson.completed ? <Check size={13} /> : canOpen ? <PlayCircle size={14} /> : <LockKeyhole size={13} />}</span>
              <span><strong>{lesson.title}</strong><small>{lesson.durationMinutes} phút · {skillLabel(lesson.skill)}{dailyLessonItems.some((item) => item.lesson?.id === lesson.id) ? ' · Hôm nay' : ''}</small></span></button>)}</div>
          </details>;
        })}
      </aside>
      <div className="roadmap-guide"><div className="roadmap-guide-icon"><BookOpenCheck size={34} /></div><h3>Cách sử dụng lộ trình</h3><p>Đây là bản đồ khóa học, không phải màn hình học. Chọn một bài bên trái để mở nội dung; trong bài học luôn có nút quay lại lộ trình.</p>{user?.role !== 'ADMIN' && <button type="button" onClick={() => navigate('/today')}>Tiếp tục bài hôm nay <ChevronRight size={17} /></button>}</div>
    </div>
  </section>;
}

export function LessonContent({ lesson, assignment, dailyItem }: { lesson?: Lesson; assignment?: DailyAssignment; dailyItem?: AssignmentItem }) {
  if (!lesson) return <article className="lesson-content"><div className="empty-state">Chưa có bài học trong chặng này.</div></article>;
  const data = lesson.contentData;
  const lines = lesson.content?.split('\n') ?? [];
  return <article className="lesson-content">
    <div className="lesson-breadcrumb">ROAD TO 800 <ChevronRight size={14} /> NGÀY {lesson.position}</div>
    <h1>{lesson.title}</h1><p className="lesson-description">{lesson.description}</p>
    <div className="lesson-meta"><span><Clock3 size={16} /> {lesson.durationMinutes} phút</span><span>+{lesson.xpReward} XP</span><span>{skillLabel(lesson.skill)}</span></div>
    {assignment && dailyItem && <DailyLessonControl assignment={assignment} item={dailyItem} />}
    {data ? <div className="structured-lesson">
      <section className="lesson-objective"><span><Trophy size={20} /></span><div><small>MỤC TIÊU HÔM NAY</small><strong>{data.objective}</strong></div></section>

      <section className="lesson-block"><div className="lesson-block-title"><BookOpenCheck size={20} /><div><small>01</small><h3>Kiến thức trọng tâm</h3></div></div>
        <ul className="theory-list">{data.theory.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className="lesson-block"><div className="lesson-block-title"><span className="block-number">02</span><div><small>TỪ VỰNG · {data.vocabularyTopic}</small><h3>{data.vocabulary.length} từ học và ôn hôm nay</h3></div></div>
        <FlashcardDeck cards={data.vocabulary} />
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
    <div className="source-note">{data?.sourceNote ?? 'TOEIC Quest quản lý lộ trình, thời gian và kết quả học tập.'}</div>
  </article>;
}

function skillLabel(skill: string): string {
  return ({ VOCABULARY: 'Từ vựng', GRAMMAR: 'Ngữ pháp', LISTENING: 'Listening', READING: 'Reading', REVIEW: 'Checkpoint', HABIT: 'Thói quen' } as Record<string, string>)[skill] ?? skill;
}
