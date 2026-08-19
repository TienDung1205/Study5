import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { getJson, patchJson } from '../../../services/api-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => getJson<Notification[]>('/notifications') });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const read = useMutation({ mutationFn: (id: string) => patchJson(`/notifications/${id}/read`), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => patchJson('/notifications/read-all'), onSuccess: refresh });
  if (notifications.isPending) return <div className="empty-state">Đang tải thông báo...</div>;
  if (notifications.isError) return <div className="error-state">{notifications.error.message}</div>;
  const unread = notifications.data.filter((item) => !item.readAt).length;
  return <section><header className="page-header"><div><p className="eyebrow">TRUNG TÂM THÔNG BÁO</p><h2>Không bỏ lỡ cột mốc</h2><p className="muted">Deadline, kế hoạch mới và thành tích đều xuất hiện tại đây.</p></div>
    <button className="primary-button button-with-icon" disabled={!unread || readAll.isPending} onClick={() => readAll.mutate()}><CheckCheck size={17} /> Đọc tất cả ({unread})</button></header>
    <div className="notification-list">{notifications.data.map((item) => <article className={item.readAt ? 'read' : ''} key={item.id} onClick={() => !item.readAt && read.mutate(item.id)}><span className="notification-icon"><Bell size={18} /></span><div><div className="notification-heading"><strong>{item.title}</strong><time>{new Date(item.createdAt).toLocaleString('vi-VN')}</time></div><p>{item.message}</p><small>{item.type}</small></div></article>)}</div>
    {!notifications.data.length && <div className="empty-state">Chưa có thông báo nào.</div>}
  </section>;
}
