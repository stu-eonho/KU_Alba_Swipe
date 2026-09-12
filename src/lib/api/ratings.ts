/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 사장님이 지원자에게 매기는 평점. 공고에 평점이 있듯 지원자에게도 평점이 붙습니다.
 *
 * 누가 누구에게 매길 수 있는지는 RLS 가 정합니다 —
 * 내 공고에 지원한 사람에게만 쓸 수 있고, 읽기는 로그인한 사용자에게 공개입니다.
 */
import { supabase } from '@/lib/supabase';
import type { RatingInput, RatingReasonCode } from '@/types';

export type SeekerRating = {
  employerId: string;
  seekerId: string;
  score: number;
  comment: string | null;
  /**
   * 이 평가자가 고른 사유.
   *
   * CRITICAL: 화면에는 **본인이 남긴 사유만** 보여줍니다. 남이 왜 그렇게 평가했는지
   * 구직자나 다른 구인자에게 노출하면 평판이 아니라 뒷말이 됩니다.
   * useSeekerRating 이 내 것만 골라 myReasons 로 넘깁니다.
   */
  reasons: RatingReasonCode[];
  otherReason: string | null;
  createdAt: string;
};

type SeekerRatingRow = {
  employer_id: string;
  seeker_id: string;
  score: number;
  comment: string | null;
  // Phase 11 마이그레이션 전 행에는 없습니다.
  reason_codes?: string[] | null;
  reason_other?: string | null;
  created_at: string;
};

function toSeekerRating(row: SeekerRatingRow): SeekerRating {
  return {
    employerId: row.employer_id,
    seekerId: row.seeker_id,
    score: row.score,
    comment: row.comment,
    reasons: (row.reason_codes as RatingReasonCode[] | null | undefined) ?? [],
    otherReason: row.reason_other ?? null,
    createdAt: row.created_at,
  };
}

/** 이 구직자가 받은 평점 전부. 평균은 훅에서 계산합니다. */
export async function fetchSeekerRatings(seekerId: string): Promise<SeekerRating[]> {
  const { data, error } = await supabase
    .from('seeker_ratings')
    .select('employer_id, seeker_id, score, comment, reason_codes, reason_other, created_at')
    .eq('seeker_id', seekerId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as SeekerRatingRow[]).map(toSeekerRating);
}

/**
 * 평가 저장 (점수 + 사유).
 *
 * RPC 한 번으로 원자 저장합니다. 테이블에 직접 upsert 하지 않는 이유는,
 * "내 공고에 지원한 사람인가"와 사유 규칙을 **DB 안에서** 다시 확인해야 하기
 * 때문입니다 — 화면 검증은 우회할 수 있지만 RPC 안의 검사는 못 합니다.
 */
export async function rateSeeker(seekerId: string, input: RatingInput): Promise<void> {
  const reasons = [...new Set(input.reasons)];
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    throw new Error('평점은 1~5 사이여야 합니다');
  }
  // 0개도 허용합니다. DB CHECK 가 cardinality = 0 을 통과시키고, 마이그레이션 전
  // 행도 빈 배열로 남아 있습니다. 상한만 막습니다.
  if (reasons.length > 3) {
    throw new Error('사유는 3개까지 고를 수 있어요');
  }

  const other = input.otherReason?.trim() || null;
  if (reasons.includes('other')) {
    if (!other || other.length < 2 || other.length > 100) {
      throw new Error('직접 입력은 2~100자로 적어 주세요');
    }
  }

  const { error } = await supabase.rpc('rate_seeker_with_reasons', {
    seeker: seekerId,
    score: input.score,
    reason_codes: reasons,
    // 'other' 를 빼면 직접 입력도 함께 지웁니다. 남겨 두면 DB CHECK 에 걸립니다.
    reason_other: reasons.includes('other') ? other : null,
  });
  if (error) throw error;
}
