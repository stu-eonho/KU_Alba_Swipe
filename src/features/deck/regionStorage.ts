/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * 지역 필터 선택값의 영속화. localStorage 하나만 씁니다 —
 * 서버에 둘 만한 값이 아니고, 기기마다 다른 편이 오히려 맞습니다.
 *
 * 읽기·쓰기 모두 try/catch 입니다. 시크릿 모드와 저장소를 막아 둔 브라우저에서는
 * localStorage 접근 자체가 throw 합니다. 그때는 조용히 빈 배열(= 전국)로 떨어집니다 —
 * 필터가 기억되지 않을 뿐, 덱은 그대로 동작해야 합니다.
 *
 * 빈 배열의 의미는 "전국"입니다. "아무 지역도 안 보임"이 아닙니다.
 */
import { REGIONS } from '@/types';

export const REGION_STORAGE_KEY = 'albaswipe.regions';

/** 저장된 지역 목록. 없거나·깨졌거나·읽기가 막혔으면 [] (= 전국). */
export function getRegions(): string[] {
  try {
    const raw = localStorage.getItem(REGION_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 목록에 없는 값은 버립니다. 예전 버전이 남긴 값이나 손으로 고친 값이
    // 그대로 들어오면 어느 칩에도 대응하지 않는 유령 필터가 됩니다.
    return parsed.filter(
      (value): value is string =>
        typeof value === 'string' && (REGIONS as readonly string[]).includes(value),
    );
  } catch {
    return [];
  }
}

/** 지역 목록 저장. 빈 배열이면 키를 지웁니다(= 전국). 실패는 삼킵니다. */
export function setRegions(list: string[]): void {
  try {
    if (list.length === 0) {
      localStorage.removeItem(REGION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 저장 실패는 사용자에게 알리지 않습니다. 이번 세션 동안은 화면 상태로 살아 있고,
    // 다음에 들어오면 전국으로 돌아갈 뿐입니다.
  }
}
