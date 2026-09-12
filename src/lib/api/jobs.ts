/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * snake_case(DB) → camelCase(앱) 변환은 오직 이 폴더 안에서만 합니다.
 * 모든 호출에 `if (error) throw error` 를 붙입니다 — supabase-js 는 스스로 throw 하지 않아서,
 * 이걸 빠뜨리면 실패가 조용히 무시되고 빈 화면만 남습니다.
 */
import { supabase } from '@/lib/supabase';
import type { Job, PersonalityTrait, Review } from '@/types';

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
  employer_id?: string | null;
  // Phase 6 마이그레이션 전에 만들어진 행에는 이 컬럼이 없습니다.
  wanted_traits?: string[] | null;
  // Phase 7. 없으면 주소에서 뽑습니다.
  region?: string | null;
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
    employerId: row.employer_id ?? null,
    wantedTraits: (row.wanted_traits as PersonalityTrait[] | null | undefined) ?? [],
    // 컬럼이 비어 있어도 화면이 빈 문자열을 받지 않게 주소에서 채웁니다.
    // "서울 성북구 안암로 145" → "서울"
    region: row.region?.trim() || row.address.split(' ')[0] || '',
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

/** 공고에 고를 수 있는 업종. 시드가 쓰는 값과 같아야 관심 직종이 맞물립니다. */
export const JOB_CATEGORIES = [
  '카페',
  '음식점',
  '편의점',
  '판매',
  '배달',
  '물류',
  '사무',
  '과외',
  '행사',
  '주방',
  '기타',
] as const;

/** 공고 작성 폼이 채우는 값. id·평점·리뷰수·주인은 서버가 정합니다. */
export type NewJob = {
  storeName: string;
  category: string;
  hourlyWage: number;
  summary: string;
  description: string;
  address: string;
  /** "월·수·금" — 가운뎃점 구분, 공백 없음 */
  workDays: string;
  /** "13:00 ~ 18:00" — 물결 앞뒤로 공백 하나씩 */
  workHours: string;
  benefits: string[];
  wantedTraits: PersonalityTrait[];
  imageUrl: string | null;
};

/**
 * 시간 겹침 판정이 파싱하는 형식 그대로인지 확인합니다.
 *
 * CRITICAL: 형식이 틀려도 insert 는 성공합니다. 그 공고만 시간 필터에서
 * 조용히 빠질 뿐이라 아무도 눈치채지 못합니다. 그래서 저장 직전에 막습니다.
 */
const WORK_DAYS_PATTERN = /^[월화수목금토일](·[월화수목금토일])*$/;
const WORK_HOURS_PATTERN = /^([01]\d|2[0-4]):[0-5]\d ~ ([01]\d|2[0-4]):[0-5]\d$/;

export function assertWorkFormat(workDays: string, workHours: string): void {
  if (!WORK_DAYS_PATTERN.test(workDays)) {
    throw new Error(`근무 요일 형식이 잘못됐습니다: "${workDays}" (예: 월·수·금)`);
  }
  if (!WORK_HOURS_PATTERN.test(workHours)) {
    throw new Error(`근무 시간 형식이 잘못됐습니다: "${workHours}" (예: 13:00 ~ 18:00)`);
  }
}

/**
 * 공고 등록 (구인자).
 *
 * employer_id 를 보내지 않습니다 — 컬럼 default 가 auth.uid() 이고,
 * RLS 의 with check (auth.uid() = employer_id) 가 남의 이름으로 올리는 것을 막습니다.
 */
export async function createJob(input: NewJob): Promise<Job> {
  assertWorkFormat(input.workDays, input.workHours);

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      store_name: input.storeName.trim(),
      category: input.category,
      hourly_wage: input.hourlyWage,
      summary: input.summary.trim(),
      description: input.description.trim(),
      address: input.address.trim(),
      work_days: input.workDays,
      work_hours: input.workHours,
      benefits: input.benefits,
      wanted_traits: input.wantedTraits,
      // 주소에서 뽑아 함께 넣습니다. 트리거 없이도 새 공고가 지역 필터에 잡힙니다.
      region: input.address.trim().split(' ')[0] ?? '',
      image_url: input.imageUrl,
    })
    .select()
    .single();
  if (error) throw error;

  return toJob(data as JobRow);
}

/** 내가 올린 공고 (구인자). 최신순. */
export async function fetchMyJobs(employerId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as JobRow[]).map(toJob);
}
