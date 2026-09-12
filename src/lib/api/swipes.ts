/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * swipes 테이블 하나가 세 가지 역할을 합니다.
 *   1. 덱 제외 — 여기 행이 있는 공고는 홈에 다시 나오지 않는다 (좌/우 무관)
 *   2. 찜 목록 — direction = 'right' 인 행이 곧 찜이다
 *   3. 찜 해제 — DELETE 가 아니라 direction 을 'left' 로 UPDATE 한다
 */
import { supabase } from '@/lib/supabase';
import { toJob, type JobRow } from '@/lib/api/jobs';
import type { SwipeDirection, WishlistEntry } from '@/types';

/** 설정 화면 통계용. */
export type SwipeStats = { seen: number; liked: number };

/**
 * 스와이프 기록. 오른쪽이면 그대로 찜이 됩니다.
 *
 * CRITICAL: insert 가 아니라 upsert. UNIQUE (user_id, job_id) 때문에
 * 재시도나 중복 탭에서 insert 는 즉시 에러가 납니다.
 * user_id 는 컬럼 default 가 auth.uid() 이므로 클라이언트가 보내지 않습니다.
 */
export async function createSwipe(jobId: string, direction: SwipeDirection): Promise<void> {
  const { error } = await supabase
    .from('swipes')
    .upsert({ job_id: jobId, direction }, { onConflict: 'user_id,job_id' });
  if (error) throw error;
}

/** 찜 목록 = direction 이 'right' 인 스와이프 + 공고 조인. 쿼리 2번이 아니라 1번. */
export async function fetchWishlist(): Promise<WishlistEntry[]> {
  const { data, error } = await supabase
    .from('swipes')
    .select('job_id, created_at, jobs(*)')
    .eq('direction', 'right')
    .order('created_at', { ascending: false });
  if (error) throw error;

  type WishlistRow = { job_id: string; created_at: string; jobs: JobRow | JobRow[] | null };

  return ((data ?? []) as unknown as WishlistRow[])
    .map((row) => {
      // 중첩 select 는 다대일이라 객체로 오지만, 타입 정의상 배열일 수도 있어 둘 다 받습니다.
      const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
      if (!job) return null;
      return { job: toJob(job), createdAt: row.created_at };
    })
    .filter((entry): entry is WishlistEntry => entry !== null);
}

/**
 * 찜 해제.
 *
 * CRITICAL: 행을 DELETE 하지 않습니다. 삭제하면 그 공고가 홈 덱에 다시 나타나는데,
 * 방금 치운 공고가 되돌아오는 셈이라 사용자에게는 버그로 보입니다.
 */
export async function unwishlist(jobId: string): Promise<void> {
  // RLS 가 내 행으로 범위를 좁혀 주므로 user_id 조건은 필요 없습니다.
  const { error } = await supabase.from('swipes').update({ direction: 'left' }).eq('job_id', jobId);
  if (error) throw error;
}

/**
 * 내 스와이프 기록 전체 삭제 (설정 화면).
 * 이게 없으면 리허설을 한 번 돌 때마다 새 계정을 만들어야 합니다.
 */
export async function resetSwipes(userId: string): Promise<void> {
  // RLS 가 이미 내 행만 지우도록 보장하지만, Supabase 는 조건 없는 delete 를 거부하므로
  // eq('user_id') 를 명시적으로 붙입니다.
  const { error } = await supabase.from('swipes').delete().eq('user_id', userId);
  if (error) throw error;
}

/** 본 공고 수 / 찜한 공고 수. 설정 화면의 숫자 두 개. */
export async function fetchSwipeStats(): Promise<SwipeStats> {
  const { data, error } = await supabase.from('swipes').select('direction');
  if (error) throw error;

  const rows = (data ?? []) as Array<{ direction: SwipeDirection }>;
  return {
    seen: rows.length,
    liked: rows.filter((row) => row.direction === 'right').length,
  };
}
