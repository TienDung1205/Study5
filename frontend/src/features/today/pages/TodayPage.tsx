import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Clock3, ExternalLink, Flag, PlayCircle, RotateCcw, Trophy } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getJson, postJson, putJson } from '../../../services/api-client';
import type { DailyAssignment, Lesson, Roadmap } from '../../../types/domain';
import { useAuthStore } from '../../auth/auth.store';
import { LessonContent } from '../../roadmap/pages/RoadmapPage';

export function TodayPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLessonId = searchParams.get('lesson');
  const roadmap = useQuery({ queryKey: ['roadmap'], queryFn: () => getJson<Roadmap>('/content/roadmap') });
  const today = useQuery({
    queryKey: ['today'],
    queryFn: () => getJson<DailyAssignment>('/assignments/today'),
    enabled: user?.role === 'LEARNER' && Boolean(roadmap.data) && !roadmap.data?.goalAchievedAt,
  });
  const upgradeGoal = useMutation({
    mutationFn: (targetScore: number) => putJson('/users/me/goal/upgrade', { targetScore }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['roadmap'] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
      ]);
    },
  });
  const studyNow = useMutation({
    mutationFn: (lessonId: string) => postJson<DailyAssignment>(`/assignments/lessons/${lessonId}/study-now`),
    onSuccess: async (assignment, lessonId) => {
      queryClient.setQueryData(['today'], assignment);
      await queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      setSearchParams({ lesson: lessonId, from: 'roadmap' });
    },
  });

  if (roadmap.isPending || (user?.role === 'LEARNER' && !roadmap.data?.goalAchievedAt && today.isPending)) return <div className="empty-state">Đang chuẩn bị bài học...</div>;
  if (roadmap.isError) return <div className="error-state">Không tải được lộ trình: {roadmap.error.message}</div>;
  if (user?.role === 'LEARNER' && today.isError && !roadmap.data.goalAchievedAt) return <div className="error-state">Không tải được bài hôm nay: {today.error.message}</div>;

  if (user?.role === 'LEARNER' && roadmap.data.goalAchievedAt && !requestedLessonId) {
    const nextTargets = [450, 600, 700, 800].filter((score) => score > roadmap.data.targetScore);
    return <section className="today-learning-page"><PageHeading admin={false} /><div className="goal-achieved-card"><Trophy size={42} /><p className="eyebrow">ĐÃ HOÀN THÀNH LỘ TRÌNH</p><h3>Bạn đã đạt mục tiêu TOEIC {roadmap.data.targetScore}</h3><p>Checkpoint gần nhất: <strong>{roadmap.data.currentScore} điểm</strong>. Hệ thống đã dừng giao bài để bạn quyết định bước tiếp theo.</p>{nextTargets.length > 0 ? <div className="goal-upgrade-actions"><span><Flag size={17} /> Nâng mục tiêu:</span>{nextTargets.map((score) => <button type="button" disabled={upgradeGoal.isPending} key={score} onClick={() => upgradeGoal.mutate(score)}>{score}</button>)}</div> : <p>Bạn đã hoàn thành mốc cao nhất của đồ án.</p>}{upgradeGoal.error && <p className="form-error">{upgradeGoal.error.message}</p>}<Link className="small-link" to="/reports">Xem báo cáo toàn bộ quá trình</Link></div></section>;
  }

  const accessibleLessons = getAccessibleLessons(roadmap.data, user?.role === 'ADMIN');
  const assignedItems = today.data?.items.filter((item) => item.lesson) ?? [];
  const assignedLesson = assignedItems.find((item) => !item.completedAt)?.lesson ?? assignedItems[0]?.lesson;
  const requestedLesson = accessibleLessons.find((lesson) => lesson.id === requestedLessonId);
  const selectedLesson = requestedLesson ?? assignedLesson ?? accessibleLessons[0];
  const selectedAssignmentItem = today.data?.items.find((item) => item.lesson?.id === selectedLesson?.id);
  const completedItems = today.data?.items.filter((item) => item.completedAt).length ?? 0;
  const orderedLessons = roadmap.data.phases.flatMap((phase) => phase.lessons);
  const selectedLessonIndex = orderedLessons.findIndex((lesson) => lesson.id === selectedLesson?.id);
  const nextLesson = selectedLessonIndex >= 0 ? orderedLessons[selectedLessonIndex + 1] : undefined;
  const canOpenNextLesson = Boolean(nextLesson && (user?.role === 'ADMIN' || nextLesson.completed || nextLesson.unlocked));
  const openLesson = (lesson: Lesson) => {
    if (user?.role === 'ADMIN' || lesson.completed || today.data?.items.some((item) => item.lesson?.id === lesson.id)) {
      setSearchParams({ lesson: lesson.id, from: 'roadmap' });
      return;
    }
    studyNow.mutate(lesson.id);
  };

  if (user?.role === 'LEARNER' && today.data?.status === 'EXCUSED' && !requestedLessonId) {
    return <section className="today-learning-page"><PageHeading admin={false} /><div className="rest-day-card"><Trophy size={34} /><div><p className="eyebrow">NGÀY NGHỈ THEO LỊCH</p><h3>Hôm nay bạn được phép nghỉ</h3><p>Streak không bị mất. Bạn vẫn có thể vào Lộ trình để xem lại một bài đã mở.</p><Link className="small-link" to="/roadmap">Mở lộ trình</Link></div></div></section>;
  }

  return <section className="today-learning-page">
    {searchParams.get('welcome') === '1' && <div className="roadmap-ready-banner"><Trophy size={24} /><div><strong>Lộ trình cá nhân đã sẵn sàng</strong><p>Bài phù hợp với điểm hiện tại đã được giao. Học đủ thời gian và hoàn thành để hệ thống cập nhật tiến độ.</p></div></div>}
    <PageHeading admin={user?.role === 'ADMIN'} />
    {today.data && <section className="today-learning-summary">
      <div><small>TIẾN ĐỘ TRONG NGÀY</small><strong>{completedItems}/{today.data.items.length} nội dung hoàn thành</strong></div>
      <span><Clock3 size={16} /> Hạn {new Date(today.data.dueAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
    </section>}
    {assignedItems.length > 1 && <nav className="today-lesson-tabs" aria-label="Bài học hôm nay">{assignedItems.map((item) => <button type="button" className={item.lesson?.id === selectedLesson?.id ? 'active' : ''} key={item.id} onClick={() => setSearchParams({ lesson: item.lesson!.id })}>{item.completedAt ? <Check size={15} /> : <PlayCircle size={15} />}{item.lesson?.title}</button>)}</nav>}
    {requestedLessonId && !requestedLesson && <div className="error-state">Bạn chưa được mở bài này trong lộ trình.</div>}
    {selectedLesson && user?.role === 'LEARNER' && selectedLesson.completed && !selectedAssignmentItem && <div className="lesson-replay-banner"><RotateCcw size={19} /><div><strong>Chế độ học lại</strong><p>Bạn có thể học lại flashcard và làm lại mini practice thoải mái; XP của lần hoàn thành cũ được giữ nguyên.</p></div></div>}
    {selectedLesson && user?.role === 'LEARNER' && !selectedLesson.completed && !selectedAssignmentItem && <div className="lesson-start-banner"><PlayCircle size={20} /><div><strong>Bài này đã được mở</strong><p>Thêm bài vào hôm nay để bật đồng hồ, điều kiện hoàn thành và XP.</p></div><button type="button" disabled={studyNow.isPending} onClick={() => studyNow.mutate(selectedLesson.id)}>{studyNow.isPending ? 'Đang chuẩn bị...' : 'Bắt đầu bài này'}</button></div>}
    {studyNow.error && <div className="error-state">{studyNow.error.message}</div>}
    {selectedLesson ? <div className="today-lesson-shell"><LessonContent lesson={selectedLesson} assignment={today.data} dailyItem={selectedAssignmentItem} /></div> : <div className="empty-state">Chưa có bài học để hiển thị.</div>}
    {selectedLesson && canOpenNextLesson && (selectedLesson.completed || Boolean(selectedAssignmentItem?.completedAt) || user?.role === 'ADMIN') && <div className="next-lesson-action"><div><strong>{nextLesson?.completed ? 'Bài tiếp theo đã từng hoàn thành' : 'Bạn đã mở khóa bài tiếp theo'}</strong><span>{nextLesson?.title}</span></div><button type="button" disabled={studyNow.isPending} onClick={() => openLesson(nextLesson!)}>{nextLesson?.completed ? 'Học lại bài tiếp theo' : user?.role === 'ADMIN' ? 'Học thử bài tiếp theo' : 'Học bài tiếp theo'} <ArrowRight size={17} /></button></div>}
    {today.data?.items.some((item) => item.externalResource) && <div className="external-assignment-note"><ExternalLink size={19} /><div><strong>Hôm nay còn bài luyện ở nguồn ngoài</strong><p>Làm bài ở website được chỉ định rồi nộp điểm để AI cập nhật năng lực theo từng Part.</p></div><Link to="/external">Mở nguồn bên ngoài</Link></div>}
  </section>;
}

function PageHeading({ admin }: { admin: boolean }) {
  return <header className="page-header today-header"><div><Link className="back-to-roadmap" to="/roadmap"><ArrowLeft size={16} /> Quay lại lộ trình</Link><p className="eyebrow">{admin ? 'CHẾ ĐỘ QUẢN TRỊ · XEM TOÀN BỘ' : 'BÀI ĐƯỢC GIAO THEO LỘ TRÌNH'}</p><h2>{admin ? 'Xem nội dung bài học' : 'Học hôm nay'}</h2><p className="muted">{admin ? 'Chọn bất kỳ bài nào từ Lộ trình để kiểm tra nội dung.' : 'Học, nghe, ôn flashcard và ghi nhận thời gian ngay trên một màn hình.'}</p></div></header>;
}

function getAccessibleLessons(roadmap: Roadmap, admin: boolean): Lesson[] {
  return roadmap.phases.flatMap((phase) => phase.lessons).filter((lesson) => admin || lesson.completed || lesson.unlocked);
}
