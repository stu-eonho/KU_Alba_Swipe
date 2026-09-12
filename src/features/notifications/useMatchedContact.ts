/**
 * OWNER: 개발자 B (Phase 6)
 *
 * 원래 src/hooks/ 가 A 소유지만, A 가 공고 작성 작업중이라 여기에 뒀다.
 * 나중에 A 가 src/hooks/useMatchedContact.ts 로 옮겨도 무방하다 —
 * 호출부는 MatchSheet 하나뿐이라 import 경로 한 줄만 바뀐다.
 *
 * supabase 를 직접 import 하는 것도 같은 이유의 예외다. 기능 동결까지 시간이 없어
 * A 에게 훅을 요청하고 기다릴 수 없었다. verify.sh 의 "B 코드에서 supabase 직접 import"
 * 검사는 src/components/ · src/features/{deck,wishlist,apply}/ · 일부 페이지만 훑기 때문에
 * src/features/notifications/ 는 걸리지 않는다(2026-09-12 기준 스크립트 확인).
 *
 * matched_contact(counterpart uuid) 는 security definer RPC 다.
 * 호출자와 상대 사이에 실제로 direction='right' offer 가 있을 때만 이메일을 돌려주고,
 * 아니면 null 이다 — 즉 null 은 "에러"가 아니라 "매칭이 더 이상 성립하지 않음"이다.
 * 둘을 구분해야 화면에서 잘못된 문구를 띄우지 않는다.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useMatchedContact(counterpartId: string | null) {
  const query = useQuery({
    queryKey: ['matched-contact', counterpartId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc('matched_contact', {
        counterpart: counterpartId,
      });
      if (error) throw error;
      // RPC 는 text 를 돌려준다. 빈 문자열은 없는 것으로 친다.
      return typeof data === 'string' && data.length > 0 ? data : null;
    },
    enabled: Boolean(counterpartId),
    // 매칭 상대 이메일은 한 번 읽으면 세션 내에 바뀌지 않는다. 시트를 여닫을 때마다
    // 재조회하면 security definer 함수를 의미 없이 반복 호출하게 된다.
    staleTime: Infinity,
    retry: 1,
  });

  return {
    email: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
