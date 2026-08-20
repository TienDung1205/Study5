import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Clock3, ExternalLink, PlayCircle, Trophy } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getJson } from '../../../services/api-client';
import type { DailyAssignment, Lesson, Roadmap } from '../../../types/domain';
import { useAuthStore } from '../../auth/auth.store';
import { LessonContent } from '../../roadmap/pages/RoadmapPage';

export function TodayPage() {
  const user = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLessonId = searchParams.get('lesson');
  const roadmap = useQuery({ queryKey: ['roadmap'], queryFn: () => getJson<Roadmap>('/content/roadmap') });
  const today = useQuery({
    queryKey: ['today'],
    queryFn: () => getJson<DailyAssignment>('/assignments/today'),
    enabled: user?.role === 'LEARNER',
  });

  if (roadmap.isPending || (user?.role === 'LEARNER' && today.isPending)) return <div className="empty-state">Đang chuẩn bị bài học...</div>;
  if (roadmap.isError) return <div className="error-state">Không tải được lộ trình: {roadmap.error.message}</div>;
  if (user?.role === 'LEARNER' && today.isError) return <div className="error-state">Không tải được bài hôm nay: {today.error.message}</div>;

  const accessibleLessons = getAccessibleLessons(roadmap.data, user?.role === 'ADMIN');
  const assignedItems = today.data?.items.filter((item) => item.lesson) ?? [];
  const assignedLesson = assignedItems.find((item) => !item.completedAt)?.lesson ?? assignedItems[0]?.lesson;
  const requestedLesson = accessibleLessons.find((lesson) => lesson.id === requestedLessonId);
  const selectedLesson = requestedLesson ?? assignedLesson ?? accessibleLessons[0];
  const selectedAssignmentItem = today.data?.items.find((item) => item.lesson?.id === selectedLesson?.id);
  const completedItems = today.data?.items.filter((item) => item.completedAt).length ?? 0;

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
    {selectedLesson ? <div className="today-lesson-shell"><LessonContent lesson={selectedLesson} assignment={today.data} dailyItem={selectedAssignmentItem} /></div> : <div className="empty-state">Chưa có bài học để hiển thị.</div>}
    {today.data?.items.some((item) => item.externalResource) && <div className="external-assignment-note"><ExternalLink size={19} /><div><strong>Hôm nay còn bài luyện ở nguồn ngoài</strong><p>Làm bài ở website được chỉ định rồi nộp điểm để AI cập nhật năng lực theo từng Part.</p></div><Link to="/external">Mở nguồn bên ngoài</Link></div>}
  </section>;
}

function PageHeading({ admin }: { admin: boolean }) {
  return <header className="page-header today-header"><div><Link className="back-to-roadmap" to="/roadmap"><ArrowLeft size={16} /> Quay lại lộ trình</Link><p className="eyebrow">{admin ? 'CHẾ ĐỘ QUẢN TRỊ · XEM TOÀN BỘ' : 'BÀI ĐƯỢC GIAO THEO LỘ TRÌNH'}</p><h2>{admin ? 'Xem nội dung bài học' : 'Học hôm nay'}</h2><p className="muted">{admin ? 'Chọn bất kỳ bài nào từ Lộ trình để kiểm tra nội dung.' : 'Học, nghe, ôn flashcard và ghi nhận thời gian ngay trên một màn hình.'}</p></div></header>;
}

function getAccessibleLessons(roadmap: Roadmap, admin: boolean): Lesson[] {
  return roadmap.phases.filter((phase) => admin || phase.unlocked).flatMap((phase) => phase.lessons);
}
