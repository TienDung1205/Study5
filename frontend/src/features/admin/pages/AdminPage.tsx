import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteJson, getJson, patchJson, postJson } from '../../../services/api-client';

interface Dashboard { learners: number; activeLearners: number; courses: number; assignments: number; completedAssignments: number; externalSubmissions: number; completionRate: number }
interface AdminUser { id: string; email: string; displayName: string; role: string; isActive: boolean; progress?: { totalXp: number; streakCount: number } }
interface AdminLesson { id: string; title: string; position: number; isPublished: boolean; durationMinutes: number }
interface AdminPhase { id: string; title: string; position: number; durationDays: number; requiredRate: number; lessons: AdminLesson[] }
interface AdminCourse { id: string; title: string; slug: string; isPublished: boolean; phases: AdminPhase[] }
interface AdminResource { id: string; name: string; provider: string; isActive: boolean; url: string }
interface AtRiskLearner { id: string; email: string; displayName: string; progress?: { streakCount: number; lastCompletedDate?: string }; _count: { assignments: number } }

export function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => getJson<Dashboard>('/admin/reports/dashboard') });
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => getJson<AdminUser[]>('/admin/users') });
  const atRisk = useQuery({ queryKey: ['admin-at-risk'], queryFn: () => getJson<AtRiskLearner[]>('/admin/reports/at-risk') });
  const courses = useQuery({ queryKey: ['admin-content'], queryFn: () => getJson<AdminCourse[]>('/admin/content') });
  const resources = useQuery({ queryKey: ['admin-resources'], queryFn: () => getJson<AdminResource[]>('/admin/external-resources') });
  const [selectedCourseId, setSelectedCourseId] = useState(''); const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [courseTitle, setCourseTitle] = useState(''); const [courseSlug, setCourseSlug] = useState('');
  const [phaseTitle, setPhaseTitle] = useState(''); const [lessonTitle, setLessonTitle] = useState('');
  const [resourceName, setResourceName] = useState(''); const [resourceUrl, setResourceUrl] = useState('');
  const selectedCourse = useMemo(() => courses.data?.find((course) => course.id === selectedCourseId), [courses.data, selectedCourseId]);
  const selectedPhase = useMemo(() => selectedCourse?.phases.find((phase) => phase.id === selectedPhaseId), [selectedCourse, selectedPhaseId]);
  useEffect(() => { if (!selectedCourseId && courses.data?.[0]) setSelectedCourseId(courses.data[0].id); }, [courses.data, selectedCourseId]);
  useEffect(() => { if (!selectedCourse?.phases.some((phase) => phase.id === selectedPhaseId)) setSelectedPhaseId(selectedCourse?.phases[0]?.id ?? ''); }, [selectedCourse, selectedPhaseId]);

  const invalidateContent = () => queryClient.invalidateQueries({ queryKey: ['admin-content'] });
  const invalidateResources = () => queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
  const createCourse = useMutation({ mutationFn: () => postJson('/admin/content/courses', { title: courseTitle, slug: courseSlug, targetScore: 800, durationWeeks: 24, isPublished: false }), onSuccess: () => { setCourseTitle(''); setCourseSlug(''); return invalidateContent(); } });
  const toggleCourse = useMutation({ mutationFn: (course: AdminCourse) => patchJson(`/admin/content/courses/${course.id}`, { isPublished: !course.isPublished }), onSuccess: invalidateContent });
  const removeCourse = useMutation({ mutationFn: (id: string) => deleteJson(`/admin/content/courses/${id}`), onSuccess: () => { setSelectedCourseId(''); return invalidateContent(); } });
  const createPhase = useMutation({ mutationFn: () => postJson('/admin/content/phases', { courseId: selectedCourseId, title: phaseTitle, position: (selectedCourse?.phases.length ?? 0) + 1, durationDays: 12, requiredRate: 0.8 }), onSuccess: () => { setPhaseTitle(''); return invalidateContent(); } });
  const removePhase = useMutation({ mutationFn: (id: string) => deleteJson(`/admin/content/phases/${id}`), onSuccess: invalidateContent });
  const createLesson = useMutation({ mutationFn: () => postJson('/admin/content/lessons', { phaseId: selectedPhaseId, title: lessonTitle, description: `Nhiệm vụ ${lessonTitle}`, content: 'Quản trị viên cập nhật checklist chi tiết tại đây.', skill: 'VOCABULARY', resourceType: 'ARTICLE', durationMinutes: 20, xpReward: 20, position: (selectedPhase?.lessons.length ?? 0) + 1, isPublished: true }), onSuccess: () => { setLessonTitle(''); return invalidateContent(); } });
  const toggleLesson = useMutation({ mutationFn: (lesson: AdminLesson) => patchJson(`/admin/content/lessons/${lesson.id}`, { isPublished: !lesson.isPublished }), onSuccess: invalidateContent });
  const removeLesson = useMutation({ mutationFn: (id: string) => deleteJson(`/admin/content/lessons/${id}`), onSuccess: invalidateContent });
  const createResource = useMutation({ mutationFn: () => postJson('/admin/external-resources', { name: resourceName, url: resourceUrl, provider: 'External', resourceType: 'EXTERNAL_PRACTICE', estimatedMinutes: 30, isActive: true }), onSuccess: () => { setResourceName(''); setResourceUrl(''); return invalidateResources(); } });
  const toggleResource = useMutation({ mutationFn: (resource: AdminResource) => patchJson(`/admin/external-resources/${resource.id}`, { isActive: !resource.isActive }), onSuccess: invalidateResources });
  const toggleUser = useMutation({ mutationFn: (user: AdminUser) => patchJson(`/admin/users/${user.id}/status`, { isActive: !user.isActive }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }) });
  const form = (handler: () => void) => (event: FormEvent) => { event.preventDefault(); handler(); };
  const confirmDelete = (message: string, action: () => void) => { if (window.confirm(message)) action(); };
  const error = createCourse.error ?? createPhase.error ?? createLesson.error ?? createResource.error ?? removeCourse.error ?? removePhase.error ?? removeLesson.error;

  return <section><header className="page-header"><div><p className="eyebrow">ADMIN CONSOLE</p><h2>Quản trị TOEIC Quest</h2><p className="muted">Quản lý nội dung hoặc mở bất kỳ bài nào để học thử, làm lại và kiểm tra giao diện.</p></div><button type="button" onClick={() => navigate('/roadmap')}>Mở toàn bộ kho bài học</button></header>
    <div className="metric-grid"><Metric value={dashboard.data?.learners ?? 0} label="Học viên" /><Metric value={dashboard.data?.activeLearners ?? 0} label="Đang hoạt động" /><Metric value={dashboard.data?.completedAssignments ?? 0} label="Ngày hoàn thành" /><Metric value={`${Math.round((dashboard.data?.completionRate ?? 0) * 100)}%`} label="Tỷ lệ hoàn thành" /></div>
    {error && <p className="form-error">{error.message}</p>}

    <div className="admin-grid"><div className="table-card"><h3>Người dùng</h3><div className="simple-table">{users.data?.map((user) => <div key={user.id}><span>{user.displayName}<small>{user.email}</small></span><strong>{user.progress?.totalXp ?? 0} XP</strong><button onClick={() => toggleUser.mutate(user)}>{user.isActive ? 'Khóa' : 'Mở'}</button></div>)}</div></div>
      <div className="table-card"><h3>Cần hỗ trợ</h3>{atRisk.data?.slice(0, 8).map((learner) => <p key={learner.id}><strong>{learner.displayName}</strong><br /><small>{learner._count.assignments} nhiệm vụ quá hạn</small></p>)}{!atRisk.data?.length && <p className="muted">Không có học viên rủi ro.</p>}</div></div>

    <div className="content-manager"><div className="manager-toolbar"><label>Khóa học<select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>{courses.data?.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label>Phase<select value={selectedPhaseId} onChange={(event) => setSelectedPhaseId(event.target.value)}>{selectedCourse?.phases.map((phase) => <option key={phase.id} value={phase.id}>Phase {phase.position}: {phase.title}</option>)}</select></label></div>
      {selectedCourse && <div className="manager-actions"><strong>{selectedCourse.title}</strong><button onClick={() => toggleCourse.mutate(selectedCourse)}>{selectedCourse.isPublished ? 'Ẩn khóa' : 'Phát hành'}</button><button className="danger-button" onClick={() => confirmDelete(`Xóa khóa “${selectedCourse.title}” và toàn bộ nội dung?`, () => removeCourse.mutate(selectedCourse.id))}>Xóa khóa</button></div>}
      {selectedPhase && <><div className="manager-actions"><span>Phase {selectedPhase.position}: <strong>{selectedPhase.title}</strong> · chuẩn {Math.round(selectedPhase.requiredRate * 100)}%</span><button className="danger-button" onClick={() => confirmDelete(`Xóa Phase “${selectedPhase.title}”?`, () => removePhase.mutate(selectedPhase.id))}>Xóa Phase</button></div><div className="lesson-admin-list">{selectedPhase.lessons.map((lesson) => <div key={lesson.id}><span><strong>{lesson.position}. {lesson.title}</strong><small>{lesson.durationMinutes} phút · {lesson.isPublished ? 'Đã phát hành' : 'Đang ẩn'}</small></span><button onClick={() => navigate(`/today?lesson=${lesson.id}&from=admin`)}>Học thử</button><button onClick={() => toggleLesson.mutate(lesson)}>{lesson.isPublished ? 'Ẩn' : 'Hiện'}</button><button className="danger-button" onClick={() => confirmDelete(`Xóa bài “${lesson.title}”?`, () => removeLesson.mutate(lesson.id))}>Xóa</button></div>)}</div></>}</div>

    <div className="admin-forms"><form onSubmit={form(() => createCourse.mutate())}><h3>Tạo khóa học</h3><input placeholder="Tên khóa" value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} required /><input placeholder="slug-khong-dau" value={courseSlug} onChange={(event) => setCourseSlug(event.target.value)} required /><button>Tạo</button></form>
      <form onSubmit={form(() => createPhase.mutate())}><h3>Thêm Phase vào khóa đã chọn</h3><input placeholder="Tên Phase" value={phaseTitle} onChange={(event) => setPhaseTitle(event.target.value)} required /><button disabled={!selectedCourse}>Thêm</button></form>
      <form onSubmit={form(() => createLesson.mutate())}><h3>Thêm bài vào Phase đã chọn</h3><input placeholder="Tên bài" value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} required /><button disabled={!selectedPhase}>Thêm</button></form>
      <form onSubmit={form(() => createResource.mutate())}><h3>Thêm nguồn ngoài</h3><input placeholder="Tên nguồn" value={resourceName} onChange={(event) => setResourceName(event.target.value)} required /><input type="url" placeholder="https://..." value={resourceUrl} onChange={(event) => setResourceUrl(event.target.value)} required /><button>Thêm</button></form></div>
    <div className="table-card"><h3>Nguồn bên ngoài ({resources.data?.length ?? 0})</h3><div className="simple-table">{resources.data?.map((resource) => <div key={resource.id}><span>{resource.name}<small>{resource.provider}</small></span><strong>{resource.isActive ? 'Đang dùng' : 'Đang ẩn'}</strong><button onClick={() => toggleResource.mutate(resource)}>{resource.isActive ? 'Ẩn' : 'Bật'}</button></div>)}</div></div>
  </section>;
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return <article className="metric-card"><strong>{value}</strong><span>{label}</span></article>;
}
