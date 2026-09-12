/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * snake_case(DB) → camelCase(앱) 변환은 오직 이 폴더 안에서만 합니다.
 * 모든 호출에 `if (error) throw error` 를 붙입니다 — supabase-js 는 스스로 throw 하지 않아서,
 * 이걸 빠뜨리면 실패가 조용히 무시되고 빈 화면만 남습니다.
 */
import { supabase } from '@/lib/supabase';
import type { Job, Review } from '@/types';

/** jobs 테이블의 한 행. DB 컬럼 그대로라 여기서만 snake_case 가 등장합니다. */
export type JobRow = {
  id: string;
  store_name: string;
  category: string;
  hourly_wage: number;
  summary: string;
  description: string;
  address: string;
  work_days: string;
  work_hours: string;
  benefits: string[] | null;
  rating: number | string | null;
  review_count: number | null;
  image_url: string | null;
};

type ReviewRow = {
  id: string;
  job_id: string;
  author_name: string;
  rating: number;
  content: string;
  created_at: string;
};

/** swipes.ts 의 조인 결과도 이 함수를 씁니다. 매핑이 두 벌이 되면 곧 어긋납니다. */
export function toJob(row: JobRow): Job {
  return {
    id: row.id,
    storeName: row.store_name,
    category: row.category,
    hourlyWage: row.hourly_wage,
    summary: row.summary,
    description: row.description,
    address: row.address,
    workDays: row.work_days,
    workHours: row.work_hours,
    benefits: row.benefits ?? [],
    // numeric(2,1) 은 드라이버에 따라 문자열로 올 수 있습니다. 화면에서 toFixed 가 터지지 않게 숫자로 고정합니다.
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    imageUrl: row.image_url,
  };
}

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    jobId: row.job_id,
    authorName: row.author_name,
    rating: row.rating,
    content: row.content,
    createdAt: row.created_at,
  };
}

/**
 * 아직 스와이프하지 않은 공고 (홈 덱).
 *
 * CRITICAL: 스와이프가 0건일 때 `.not('id','in','()')` 는 SQL 문법 오류입니다.
 * 배열이 비었으면 .not() 자체를 붙이지 않습니다. 신규 가입 직후 첫 화면에서 터지는 버그입니다.
 */
export async function fetchDeckJobs(): Promise<Job[]> {
  // RLS 가 내 행만 돌려주므로 user_id 조건을 따로 붙이지 않습니다.
  const { data: swipeRows, error: swipeError } = await supabase.from('swipes').select('job_id');
  if (swipeError) throw swipeError;

  const seenIds = (swipeRows ?? []).map((row) => row.job_id as string);

  let query = supabase.from('jobs').select('*').limit(20);
  if (seenIds.length > 0) {
    query = query.not('id', 'in', `(${seenIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // 정렬하지 않습니다 — 추천 알고리즘은 범위 밖이고, 시드 순서 그대로 나옵니다.
  return ((data ?? []) as JobRow[]).map(toJob);
}

/** 공고 하나의 리뷰. 카드 뒷면에 최신 3개까지. */
export async function fetchReviews(jobId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('job_reviews')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(3);
  if (error) throw error;

  return ((data ?? []) as ReviewRow[]).map(toReview);
}
