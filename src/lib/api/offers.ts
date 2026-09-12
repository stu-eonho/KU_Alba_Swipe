/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * offers = 사장님이 지원자에게 보인 반응. 사장님 1명당 지원자 1명에 1행입니다.
 *   right = 관심 있음 (구직자에게 알림이 갑니다)
 *   left  = 관심 없음 (행은 지우지 않습니다 — 그래야 그 지원자가 다시 뜨지 않습니다)
 *
 * 알림은 이 파일이 만들지 않습니다. offers 에 right 가 들어오면 DB trigger 가
 * 상대가 이미 지원했는지 보고 매칭/관심 알림을 만듭니다.
 */
import { supabase } from '@/lib/supabase';
import type { Offer, OfferDirection } from '@/types';

type OfferRow = {
  employer_id: string;
  seeker_id: string;
  job_id: string | null;
  direction: OfferDirection;
  created_at: string;
};

function toOffer(row: OfferRow): Offer {
  return {
    employerId: row.employer_id,
    seekerId: row.seeker_id,
    jobId: row.job_id,
    direction: row.direction,
    createdAt: row.created_at,
  };
}

/** 내가(사장님) 이미 판단한 지원자들. RLS 가 내 행만 돌려줍니다. */
export async function fetchMyOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('employer_id, seeker_id, job_id, direction, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as OfferRow[]).map(toOffer);
}

/**
 * 지원자에 대한 판단 기록.
 *
 * upsert 입니다. 같은 지원자를 다시 판단하는 경로가 생겨도 그대로 동작합니다 —
 * insert 면 UNIQUE (employer_id, seeker_id)
 * 때문에 되살리기가 에러로 떨어집니다.
 *
 * employer_id 는 컬럼 default 가 auth.uid() 이므로 보내지 않습니다.
 */
export async function createOffer(
  seekerId: string,
  direction: OfferDirection,
  jobId?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('offers')
    .upsert(
      { seeker_id: seekerId, direction, job_id: jobId ?? null },
      { onConflict: 'employer_id,seeker_id' },
    );
  if (error) throw error;
}
