/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 지원서. 구직자가 쓰고, 사업자가 읽고 상태를 바꿉니다.
 * 누가 무엇을 볼 수 있는지는 전부 RLS 가 정합니다 (schema_phase2.sql 4번 블록).
 */
import { supabase } from '@/lib/supabase';
import { toJob, type JobRow } from '@/lib/api/jobs';
import { fetchSeekerProfiles } from '@/lib/api/profiles';
import type { ApplicantEntry, ApplicationStatus, MyApplication } from '@/types';

type ApplicationRow = {
  id: string;
  user_id: string;
  job_id: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  jobs: JobRow | JobRow[] | null;
};

/** 중첩 select 는 다대일이라 객체로 오지만, 타입 정의상 배열일 수도 있어 둘 다 받습니다. */
function firstJob(jobs: JobRow | JobRow[] | null): JobRow | null {
  return Array.isArray(jobs) ? (jobs[0] ?? null) : jobs;
}

/**
 * 지원하기.
 *
 * upsert 입니다 — 같은 공고에 다시 지원하면 메시지만 갱신됩니다.
 * insert 면 UNIQUE (user_id, job_id) 때문에 두 번째 지원이 에러가 나는데,
 * 데모에서 버튼을 눌렀을 때 에러가 뜨면 그 순간 끝납니다.
 * user_id 는 컬럼 default 가 auth.uid() 이므로 보내지 않습니다.
 */
export async function applyToJob(jobId: string, message: string): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .upsert({ job_id: jobId, message: message.trim() || null }, { onConflict: 'user_id,job_id' });
  if (error) throw error;
}

/** 내가 낸 지원서 (구직자). 최신순. */
export async function fetchMyApplications(): Promise<MyApplication[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('id, message, status, created_at, jobs(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as ApplicationRow[])
    .map((row) => {
      const job = firstJob(row.jobs);
      if (!job) return null;
      return {
        id: row.id,
        job: toJob(job),
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
      };
    })
    .filter((entry): entry is MyApplication => entry !== null);
}

/**
 * 내 공고에 들어온 지원서 (사업자).
 *
 * 쿼리를 두 번 나눕니다. applications 와 seeker_profiles 사이에는 직접 FK 가 없어서
 * (둘 다 auth.users 를 가리킬 뿐) PostgREST 가 중첩 select 로 붙여 주지 못합니다.
 * 조인은 여기서 합니다.
 */
export async function fetchEmployerApplicants(jobId?: string): Promise<ApplicantEntry[]> {
  let query = supabase
    .from('applications')
    // jobs!inner 라야 RLS 가 걸러낸 "내 공고" 로 결과가 좁혀집니다.
    .select('id, user_id, message, status, created_at, jobs!inner(*)')
    .order('created_at', { ascending: false });
  if (jobId) query = query.eq('job_id', jobId);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as unknown as ApplicationRow[]).filter((row) => firstJob(row.jobs));
  if (rows.length === 0) return [];

  // 같은 사람이 여러 공고에 지원했을 수 있으니 중복을 없애고 한 번에 가져옵니다.
  const profiles = await fetchSeekerProfiles([...new Set(rows.map((row) => row.user_id))]);
  const byUserId = new Map(profiles.map((profile) => [profile.userId, profile]));

  return rows.map((row) => {
    const profile = byUserId.get(row.user_id) ?? null;
    return {
      id: row.id,
      status: row.status,
      message: row.message,
      createdAt: row.created_at,
      job: toJob(firstJob(row.jobs)!),
      seeker: {
        id: row.user_id,
        // 프로필을 아직 안 만든 지원자도 목록에서 이름 없이 보이면 안 됩니다.
        nickname: profile?.nickname?.trim() || '이름 없음',
        profile,
      },
    };
  });
}

/** 지원서 상태 변경 (사업자). RLS 가 내 공고의 지원서로 범위를 좁힙니다. */
export async function setApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
): Promise<void> {
  const { error } = await supabase.from('applications').update({ status }).eq('id', applicationId);
  if (error) throw error;
}
