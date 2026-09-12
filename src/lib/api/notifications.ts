/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 인앱 알림. 이번 범위는 앱 안에서만 보여주는 알림이고,
 * OS push·이메일·SMS 는 범위 밖입니다.
 *
 * CRITICAL: 알림 생성 함수는 여기 없습니다. 있으면 안 됩니다.
 * notifications 테이블에는 INSERT 정책이 없고, 알림은 DB trigger 로만 생깁니다.
 * 클라이언트가 임의의 제목으로 남에게 알림을 보낼 수 있으면 안 되기 때문입니다.
 * 이 파일이 하는 일은 읽기와 읽음 처리뿐입니다.
 */
import { supabase } from '@/lib/supabase';
import type { NotificationItem, NotificationType } from '@/types';

type NotificationJobRow = { id: string; store_name: string; image_url: string | null };

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  application_id: string | null;
  job_id: string | null;
  jobs: NotificationJobRow | NotificationJobRow[] | null;
};

function toNotification(row: NotificationRow): NotificationItem {
  // 중첩 select 는 다대일이라 객체로 오지만, 타입 정의상 배열일 수도 있어 둘 다 받습니다.
  const job = Array.isArray(row.jobs) ? (row.jobs[0] ?? null) : row.jobs;

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    payload: row.payload ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
    applicationId: row.application_id,
    jobId: row.job_id,
    job: job ? { id: job.id, storeName: job.store_name, imageUrl: job.image_url } : null,
  };
}

/** 카드에 필요한 공고 정보만 가져옵니다. 알림 50건에 공고 전체를 붙이면 낭비입니다. */
const SELECT =
  'id, type, title, body, payload, read_at, created_at, application_id, job_id, jobs(id, store_name, image_url)';

/** 최신순 알림. RLS 가 내 것만 돌려줍니다. */
export async function fetchNotifications(limit = 50): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return ((data ?? []) as unknown as NotificationRow[]).map(toNotification);
}

/** 읽지 않은 알림 수. 배지 숫자입니다. head 요청이라 행을 받아오지 않습니다. */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;

  return count ?? 0;
}

/**
 * 알림 1건 읽음 처리.
 *
 * 이미 읽은 행은 건드리지 않습니다(`is('read_at', null)`) — 다시 쓰면
 * 처음 읽은 시각이 눌러볼 때마다 갱신됩니다.
 */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  if (error) throw error;
}

/** 모두 읽음. RLS 가 내 행으로 범위를 좁히지만, 조건 없는 update 는 거부되므로 조건을 답니다. */
export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}
