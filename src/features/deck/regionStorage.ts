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
 *
 * ## 저장 형식 (PHASE8 G7)
 *
 * 키(`albaswipe.regions`)와 타입(문자열 배열)은 그대로입니다. 값의 문법만 넓혔습니다.
 *
 *   "서울"            시·도 전체
 *   "서울>서대문구"    그 시·도의 구/시/군 하나
 *
 * `'>'` 가 없으면 예전 버전이 남긴 값이고, 그 의미가 곧 "시·도 전체"라
 * **마이그레이션이 필요 없습니다.** 구 단위를 모르는 예전 빌드로 되돌아가도
 * `getRegions()` 가 `"서울>서대문구"` 를 버릴 뿐 덱은 전국으로 동작합니다.
 */
import { REGIONS } from '@/types';

export const REGION_STORAGE_KEY = 'albaswipe.regions';

/** 시·도와 구를 잇는 구분자. 주소에 나올 수 없는 문자라야 파싱이 안전합니다. */
export const REGION_SEP = '>';

/** `"서울>서대문구"` → `{ city: '서울', area: '서대문구' }`. 구가 없으면 area 는 null. */
export function parseRegion(entry: string): { city: string; area: string | null } {
  const index = entry.indexOf(REGION_SEP);
  if (index === -1) return { city: entry, area: null };
  return { city: entry.slice(0, index), area: entry.slice(index + 1) || null };
}

/** `('서울', '서대문구')` → `"서울>서대문구"`. area 가 없으면 시·도만. */
export function makeRegion(city: string, area?: string | null): string {
  return area ? `${city}${REGION_SEP}${area}` : city;
}

/** 저장·선택된 항목들에서 시·도만 뽑아 중복을 없앱니다. `useDeck` 에 이걸 넘깁니다. */
export function citiesOf(entries: string[]): string[] {
  return [...new Set(entries.map((entry) => parseRegion(entry).city))];
}

/**
 * 공고 주소의 두 번째 조각이 구/시/군입니다 — `"서울 서대문구 신촌로 83"` → `"서대문구"`.
 * DB 에 컬럼을 추가하지 않고 여기서 뽑습니다(PHASE8 G7).
 */
export function areaOfAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const parts = address.trim().split(/\s+/);
  return parts[1] ?? null;
}

/** 저장된 지역 목록. 없거나·깨졌거나·읽기가 막혔으면 [] (= 전국). */
export function getRegions(): string[] {
  try {
    const raw = localStorage.getItem(REGION_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 시·도가 목록에 없는 값은 버립니다. 예전 버전이 남긴 값이나 손으로 고친 값이
    // 그대로 들어오면 어느 칩에도 대응하지 않는 유령 필터가 됩니다.
    return parsed.filter((value): value is string => {
      if (typeof value !== 'string' || value.length === 0) return false;
      const { city } = parseRegion(value);
      return (REGIONS as readonly string[]).includes(city);
    });
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
