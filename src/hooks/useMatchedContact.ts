/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 매칭된 상대의 이메일. 채팅 대신 연락처를 여는 경로입니다.
 *
 *   const { contact, isLoading, isError, retry } = useMatchedContact(counterpartId);
 *   contact?.email / contact?.phone
 *
 * B (PHASE6 B-2): mutual_match 알림의 payload.counterpartId 를 그대로 넘기세요.
 *
 *   contact === null → 아직 매칭이 아니거나 볼 권한이 없습니다.
 *                     두 경우를 구분하지 마세요 — 구분해서 보여주면 그 자체가
 *                     "이 사람과 매칭되지 않았다"는 정보를 흘립니다.
 *                     "연락처를 불러오지 못했어요" 한 문구로 처리하세요.
 *   isError         → 네트워크/서버 실패. 재시도 버튼을 주세요.
 *
 * auth.users 는 REST 로 노출되지 않습니다. matched_contact() 는 security definer 라
 * 서버에서 양쪽 offers 를 확인한 뒤에만 이메일을 돌려줍니다.
 * 이메일을 받아올 수 있다는 것 자체가 매칭의 증명입니다.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { PhoneContact } from '@/types';

export async function fetchMatchedContact(counterpartId: string): Promise<PhoneContact | null> {
  const { data, error } = await supabase.rpc('matched_contact_v2', {
    counterpart: counterpartId,
  });
  if (error) throw error;

  // 매칭이 아니거나 상대 id 가 틀리면 null 입니다. 두 경우를 구분하지 않습니다.
  if (!data || typeof data !== 'object') return null;

  const row = data as { email?: unknown; phone?: unknown };
  const email = typeof row.email === 'string' && row.email ? row.email : null;
  const phone = typeof row.phone === 'string' && row.phone ? row.phone : null;

  // 둘 다 비면 볼 것이 없습니다. 화면이 빈 시트를 그리지 않게 null 로 통일합니다.
  if (!email && !phone) return null;

  return { email, phone };
}

export function useMatchedContact(counterpartId?: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['matched-contact', counterpartId],
    queryFn: () => fetchMatchedContact(counterpartId!),
    enabled: Boolean(user) && Boolean(counterpartId),
    // 매칭 상대의 이메일은 세션 안에서 바뀌지 않습니다. 시트를 여닫을 때마다
    // 다시 물어보면 열 때마다 로딩이 한 번씩 깜빡입니다.
    staleTime: Infinity,
  });

  return {
    /** { email, phone }. 매칭이 아니면 null — 이유를 구분해 보여주지 마세요 */
    contact: query.data ?? null,
    /** 예전 호출부 호환. 새 화면은 contact 를 쓰세요 */
    email: query.data?.email ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: query.refetch,
  };
}
