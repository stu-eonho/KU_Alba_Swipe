/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 사장님이 지원자에게 매기는 평점. 공고에 평점이 있듯 지원자에게도 평점이 붙습니다.
 *
 * 누가 누구에게 매길 수 있는지는 RLS 가 정합니다 —
 * 내 공고에 지원한 사람에게만 쓸 수 있고, 읽기는 로그인한 사용자에게 공개입니다.
 */
import { supabase } from '@/lib/supabase';

export type SeekerRating = {
  employerId: string;
  seekerId: string;
  score: number;
  comment: string | null;
  createdAt: string;
};

type SeekerRatingRow = {
  employer_id: string;
  seeker_id: string;
  score: number;
  comment: string | null;
  created_at: string;
};

function toSeekerRating(row: SeekerRatingRow): SeekerRating {
  return {
    employerId: row.employer_id,
    seekerId: row.seeker_id,
    score: row.score,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

/** 이 구직자가 받은 평점 전부. 평균은 훅에서 계산합니다. */
export async function fetchSeekerRatings(seekerId: string): Promise<SeekerRating[]> {
  const { data, error } = await supabase
    .from('seeker_ratings')
    .select('employer_id, seeker_id, score, comment, created_at')
    .eq('seeker_id', seekerId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as SeekerRatingRow[]).map(toSeekerRating);
}

/**
 * 평점 남기기.
 *
 * upsert 입니다 — 사장님 1명당 지원자 1명에 1행이라, 다시 매기면 덮어씁니다.
 * insert 면 두 번째 평가가 PK 충돌로 에러가 납니다.
 * employer_id 는 컬럼 default 가 auth.uid() 이므로 보내지 않습니다.
 */
export async function rateSeeker(seekerId: string, score: number, comment?: string): Promise<void> {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error('평점은 1~5 사이의 정수여야 합니다.');
  }

  const { error } = await supabase
    .from('seeker_ratings')
    .upsert(
      { seeker_id: seekerId, score, comment: comment?.trim() || null },
      { onConflict: 'employer_id,seeker_id' },
    );
  if (error) throw error;
}
