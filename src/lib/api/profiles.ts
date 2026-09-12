/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * seeker_profiles 접근. snake_case → camelCase 변환은 여기서만 합니다.
 *
 * 읽기 범위는 RLS 가 정합니다:
 *   - 본인은 자기 프로필
 *   - 구인자는 자기 공고에 지원한 사람의 프로필만
 * 그래서 여기서 권한을 다시 검사하지 않습니다.
 */
import { supabase } from '@/lib/supabase';
import type { Mbti, PersonalityTrait, SeekerProfile } from '@/types';

type SeekerProfileRow = {
  user_id: string;
  nickname: string | null;
  intro: string | null;
  experience: string | null;
  interests: string[] | null;
  desired_wage: number | null;
  avatar_url: string | null;
  resume_url: string | null;
  updated_at: string;
  // Phase 3 마이그레이션 전에 만들어진 행에는 이 두 컬럼이 없습니다.
  mbti?: string | null;
  personality_traits?: string[] | null;
};

export function toSeekerProfile(row: SeekerProfileRow): SeekerProfile {
  return {
    userId: row.user_id,
    nickname: row.nickname,
    intro: row.intro,
    experience: row.experience,
    interests: row.interests ?? [],
    desiredWage: row.desired_wage,
    avatarUrl: row.avatar_url,
    resumeUrl: row.resume_url,
    updatedAt: row.updated_at,
    // 마이그레이션 전 행, 프로필 없는 사용자, 새 행 세 경우 모두 여기서 흡수합니다.
    mbti: (row.mbti as Mbti | null | undefined) ?? null,
    personalityTraits: (row.personality_traits as PersonalityTrait[] | null | undefined) ?? [],
  };
}

/** 프로필 1건. 아직 만들지 않았거나 볼 권한이 없으면 null. */
export async function fetchSeekerProfile(userId: string): Promise<SeekerProfile | null> {
  const { data, error } = await supabase
    .from('seeker_profiles')
    .select('*')
    .eq('user_id', userId)
    // single() 은 0건일 때 에러를 냅니다. 프로필이 없는 건 정상 상태라 maybeSingle() 을 씁니다.
    .maybeSingle();
  if (error) throw error;

  return data ? toSeekerProfile(data as SeekerProfileRow) : null;
}

/** 여러 명의 프로필을 한 번에. 구인자 지원자 목록에서 씁니다. */
export async function fetchSeekerProfiles(userIds: string[]): Promise<SeekerProfile[]> {
  // 빈 배열로 .in() 을 부르면 PostgREST 가 빈 결과를 주긴 하지만, 쓸데없는 왕복입니다.
  if (userIds.length === 0) return [];

  const { data, error } = await supabase.from('seeker_profiles').select('*').in('user_id', userIds);
  if (error) throw error;

  return ((data ?? []) as SeekerProfileRow[]).map(toSeekerProfile);
}

/** 화면에서 고칠 수 있는 필드만. userId 와 updatedAt 은 서버가 정합니다. */
export type SeekerProfilePatch = Partial<
  Pick<
    SeekerProfile,
    | 'nickname'
    | 'intro'
    | 'experience'
    | 'interests'
    | 'desiredWage'
    | 'mbti'
    | 'personalityTraits'
    | 'avatarUrl'
  >
>;

/**
 * 프로필 저장. insert 가 아니라 upsert 입니다 —
 * 가입 때 만들어진 행이 있을 수도, 없을 수도 있습니다.
 */
export async function saveSeekerProfile(
  userId: string,
  patch: SeekerProfilePatch,
): Promise<SeekerProfile> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (patch.nickname !== undefined) row.nickname = patch.nickname;
  if (patch.intro !== undefined) row.intro = patch.intro;
  if (patch.experience !== undefined) row.experience = patch.experience;
  if (patch.interests !== undefined) row.interests = patch.interests;
  if (patch.desiredWage !== undefined) row.desired_wage = patch.desiredWage;
  if (patch.mbti !== undefined) row.mbti = patch.mbti;
  if (patch.personalityTraits !== undefined) row.personality_traits = patch.personalityTraits;
  // 업로드 훅이 채웁니다. 화면에서 직접 URL 을 넣지 마세요 — Storage 경로 규칙이 깨집니다.
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;

  const { data, error } = await supabase
    .from('seeker_profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;

  return toSeekerProfile(data as SeekerProfileRow);
}
