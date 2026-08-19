import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, Clock3, ExternalLink, LockKeyhole, PlayCircle } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getJson } from '../../../services/api-client';
import type { Lesson, Roadmap } from '../../../types/domain';

export function RoadmapPage() {
  const roadmap = useQuery({ queryKey: ['roadmap'], queryFn: () => getJson<Roadmap>('/content/roadmap') });
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLessonId = searchParams.get('lesson');

  const fallbackLesson = useMemo(() => {
    const activePhase = roadmap.data?.phases.find((phase) => phase.id === roadmap.data.currentPhaseId);
    return activePhase?.lessons.find((lesson) => !lesson.completed) ?? activePhase?.lessons[0];
  }, [roadmap.data]);
  const selectedLesson = useMemo(() => {
    const lessons = roadmap.data?.phases.filter((phase) => phase.unlocked).flatMap((phase) => phase.lessons) ?? [];
    return lessons.find((lesson) => lesson.id === requestedLessonId) ?? fallbackLesson;
  }, [fallbackLesson, requestedLessonId, roadmap.data]);

  useEffect(() => {
    if (!requestedLessonId && fallbackLesson) setSearchParams({ lesson: fallbackLesson.id }, { replace: true });
  }, [fallbackLesson, requestedLessonId, setSearchParams]);

  if (roadmap.isPending) return <div className="empty-state">Đang tải lộ trình...</div>;
  if (roadmap.isError) return <div className="error-state">{roadmap.error.message}</div>;

  const totalLessons = roadmap.data.phases.reduce((sum, phase) => sum + phase.lessons.length, 0);
  const completedLessons = roadmap.data.phases.reduce((sum, phase) => sum + phase.completedLessons, 0);
  const progress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return <section className="course-page">
    <header className="course-header"><div><p className="eyebrow">LỘ TRÌNH {roadmap.data.durationWeeks} TUẦN · 6 NGÀY/TUẦN</p><h2>{roadmap.data.title}</h2><p className="muted">{roadmap.data.description}</p></div>
      <div className="course-total-progress"><strong>{progress}%</strong><span>{completedLessons}/{totalLessons} ngày học</span><div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div></div></header>
    <div className="course-player">
      <aside className="curriculum-panel"><div className="curriculum-title"><strong>Nội dung khóa học</strong><span>{roadmap.data.phases.length} chặng</span></div>
        {roadmap.data.phases.map((phase) => {
          const active = roadmap.data.currentPhaseId === phase.id;
          const phaseProgress = phase.lessons.length ? Math.round((phase.completedLessons / phase.lessons.length) * 100) : 0;
          return <details key={phase.id} open={active || phase.lessons.some((lesson) => lesson.id === selectedLesson?.id)} className="curriculum-phase">
            <summary><span><small>PHASE {phase.position}</small><strong>{phase.title}</strong><em>{phase.unlocked ? `${phase.completedLessons}/${phase.lessons.length} bài · ${phaseProgress}%${phase.masteryAccuracy !== null ? ` · Mastery ${Math.round(phase.masteryAccuracy * 100)}%` : ''}` : 'Hoàn thành Phase trước để mở'}</em></span>{phase.unlocked ? <ChevronRight size={18} /> : <LockKeyhole size={17} />}</summary>
            <div className="curriculum-lessons">{phase.lessons.map((lesson) => <button type="button" disabled={!phase.unlocked} className={lesson.id === selectedLesson?.id ? 'selected' : ''} key={lesson.id} onClick={() => setSearchParams({ lesson: lesson.id })}>
              <span className={`lesson-state${lesson.completed ? ' done' : ''}`}>{lesson.completed ? <Check size={13} /> : active ? <PlayCircle size={14} /> : <LockKeyhole size={13} />}</span>
              <span><strong>{lesson.title}</strong><small>{lesson.durationMinutes} phút · {skillLabel(lesson.skill)}</small></span></button>)}</div>
          </details>;
        })}
      </aside>
      <LessonContent lesson={selectedLesson} />
    </div>
  </section>;
}

function LessonContent({ lesson }: { lesson?: Lesson }) {
  if (!lesson) return <article className="lesson-content"><div className="empty-state">Chưa có bài học trong chặng này.</div></article>;
  const lines = lesson.content?.split('\n') ?? [];
  return <article className="lesson-content">
    <div className="lesson-breadcrumb">ROAD TO 800 <ChevronRight size={14} /> NGÀY {lesson.position}</div>
    <h1>{lesson.title}</h1><p className="lesson-description">{lesson.description}</p>
    <div className="lesson-meta"><span><Clock3 size={16} /> {lesson.durationMinutes} phút</span><span>+{lesson.xpReward} XP</span><span>{skillLabel(lesson.skill)}</span></div>
    <div className="lesson-guide">{lines.map((line, index) => {
      if (!line) return <div className="content-spacer" key={index} />;
      if (line === line.toUpperCase() && !line.startsWith('-')) return <h3 key={index}>{line}</h3>;
      return <p className={/^\d+\.|^-/.test(line) ? 'instruction-line' : ''} key={index}>{line}</p>;
    })}</div>
    {lesson.contentUrl && <a className="external-practice-button" href={lesson.contentUrl} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Mở nguồn luyện tập tham khảo</a>}
    <div className="source-note">TOEIC Quest quản lý lộ trình và kết quả. Bài luyện/đề thi được thực hiện tại nguồn bên ngoài.</div>
  </article>;
}

function skillLabel(skill: string): string {
  return ({ VOCABULARY: 'Từ vựng', GRAMMAR: 'Ngữ pháp', LISTENING: 'Listening', READING: 'Reading', REVIEW: 'Checkpoint', HABIT: 'Thói quen' } as Record<string, string>)[skill] ?? skill;
}
