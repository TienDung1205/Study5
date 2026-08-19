import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { getJson, patchJson, postJson } from '../../../services/api-client';

interface Dashboard { learners: number; activeLearners: number; courses: number; assignments: number; completedAssignments: number; externalSubmissions: number; completionRate: number }
interface AdminUser { id: string; email: string; displayName: string; role: string; isActive: boolean; progress?: { totalXp: number; streakCount: number } }
interface AdminCourse { id: string; title: string; slug: string; isPublished: boolean; phases: Array<{ id: string; title: string; position: number; lessons: Array<{ id: string; title: string }> }> }

export function AdminPage() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => getJson<Dashboard>('/admin/reports/dashboard') });
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => getJson<AdminUser[]>('/admin/users') });
  const courses = useQuery({ queryKey: ['admin-content'], queryFn: () => getJson<AdminCourse[]>('/admin/content') });
  const resources = useQuery({ queryKey: ['admin-resources'], queryFn: () => getJson<Array<{ id: string; name: string; provider: string; isActive: boolean }>>('/admin/external-resources') });
  const [courseTitle, setCourseTitle] = useState(''); const [courseSlug, setCourseSlug] = useState('');
  const [phaseTitle, setPhaseTitle] = useState(''); const [lessonTitle, setLessonTitle] = useState('');
  const [resourceName, setResourceName] = useState(''); const [resourceUrl, setResourceUrl] = useState('');
  const invalidateContent = () => queryClient.invalidateQueries({ queryKey: ['admin-content'] });
  const createCourse = useMutation({ mutationFn: () => postJson('/admin/content/courses', { title: courseTitle, slug: courseSlug, targetScore: 800, durationWeeks: 24, isPublished: false }), onSuccess: invalidateContent });
  const createPhase = useMutation({ mutationFn: () => postJson('/admin/content/phases', { courseId: courses.data?.[0]?.id, title: phaseTitle, position: (courses.data?.[0]?.phases.length ?? 0) + 1, durationDays: 12 }), onSuccess: invalidateContent });
  const createLesson = useMutation({ mutationFn: () => postJson('/admin/content/lessons', { phaseId: courses.data?.[0]?.phases[0]?.id, title: lessonTitle, skill: 'VOCABULARY', resourceType: 'ARTICLE', durationMinutes: 20, xpReward: 20, position: (courses.data?.[0]?.phases[0]?.lessons.length ?? 0) + 1, isPublished: true }), onSuccess: invalidateContent });
  const createResource = useMutation({ mutationFn: () => postJson('/admin/external-resources', { name: resourceName, url: resourceUrl, provider: 'External', resourceType: 'EXTERNAL_PRACTICE', estimatedMinutes: 30, isActive: true }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-resources'] }) });
  const toggleUser = useMutation({ mutationFn: (user: AdminUser) => patchJson(`/admin/users/${user.id}/status`, { isActive: !user.isActive }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }) });
  function form(handler: () => void) { return (event: FormEvent) => { event.preventDefault(); handler(); }; }
  return <section><header className="page-header"><div><p className="eyebrow">ADMIN CONSOLE</p><h2>Quản trị TOEIC Quest</h2><p className="muted">Nội dung, người học và nguồn bên ngoài.</p></div></header>
    <div className="metric-grid"><article className="metric-card"><strong>{dashboard.data?.learners ?? 0}</strong><span>Học viên</span></article><article className="metric-card"><strong>{dashboard.data?.activeLearners ?? 0}</strong><span>Đang hoạt động</span></article><article className="metric-card"><strong>{dashboard.data?.completedAssignments ?? 0}</strong><span>Ngày hoàn thành</span></article><article className="metric-card"><strong>{Math.round((dashboard.data?.completionRate ?? 0) * 100)}%</strong><span>Tỷ lệ hoàn thành</span></article></div>
    <div className="admin-grid"><div className="table-card"><h3>Người dùng</h3><div className="simple-table">{users.data?.map((user) => <div key={user.id}><span>{user.displayName}<small>{user.email}</small></span><strong>{user.progress?.totalXp ?? 0} XP</strong><button onClick={() => toggleUser.mutate(user)}>{user.isActive ? 'Khóa' : 'Mở'}</button></div>)}</div></div>
      <div className="table-card"><h3>Khóa học</h3>{courses.data?.map((course) => <p key={course.id}><strong>{course.title}</strong> · {course.phases.length} Phase</p>)}</div></div>
    <div className="admin-forms"><form onSubmit={form(() => createCourse.mutate())}><h3>Tạo khóa học</h3><input placeholder="Tên khóa" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required /><input placeholder="slug" value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)} required /><button>Tạo</button></form>
      <form onSubmit={form(() => createPhase.mutate())}><h3>Thêm Phase vào khóa đầu</h3><input placeholder="Tên Phase" value={phaseTitle} onChange={(e) => setPhaseTitle(e.target.value)} required /><button disabled={!courses.data?.[0]}>Thêm</button></form>
      <form onSubmit={form(() => createLesson.mutate())}><h3>Thêm bài vào Phase đầu</h3><input placeholder="Tên bài" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} required /><button disabled={!courses.data?.[0]?.phases[0]}>Thêm</button></form>
      <form onSubmit={form(() => createResource.mutate())}><h3>Thêm nguồn ngoài</h3><input placeholder="Tên nguồn" value={resourceName} onChange={(e) => setResourceName(e.target.value)} required /><input type="url" placeholder="https://..." value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} required /><button>Thêm</button></form></div>
    <div className="table-card"><h3>Nguồn bên ngoài ({resources.data?.length ?? 0})</h3>{resources.data?.map((resource) => <p key={resource.id}>{resource.name} · {resource.provider}</p>)}</div>
  </section>;
}

