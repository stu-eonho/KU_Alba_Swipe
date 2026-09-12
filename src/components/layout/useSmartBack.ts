/** OWNER: 개발자 B (ui-foundation) — 단독 소유 */
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * 뒤로가기. 앱 안에서 이동해 왔으면 히스토리를 되돌리고,
 * 링크를 직접 열었거나 새로고침했으면 fallback 으로 간다.
 *
 * location.key 는 react-router 가 히스토리 엔트리마다 부여하는 값인데,
 * 그 세션의 첫 진입에서는 'default' 다. 이때 navigate(-1) 을 하면
 * 앱 밖(브라우저 히스토리의 이전 사이트)으로 나가버린다.
 *
 * 고정 경로로 돌아가면 "알림 → 지원 상세 → 뒤로"가 지원 현황으로 가는 식의
 * 어긋남이 생기므로, "온 곳으로 돌아간다"를 기본으로 두고 fallback 은
 * 히스토리가 없을 때만 쓴다.
 */
export function useSmartBack(fallback: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.key === 'default') {
      navigate(fallback, { replace: true });
      return;
    }
    navigate(-1);
  }, [navigate, location.key, fallback]);
}
