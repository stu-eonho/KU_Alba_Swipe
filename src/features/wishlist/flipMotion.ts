/**
 * OWNER: 개발자 B (deck-interaction) — 확대·뒤집기 소유
 *
 * ALBASWIPE_SPEC.md <flip_interaction> + <animations><flip>
 *
 * 확대 카드와 격자 셀이 **같은 transition**을 써야 열 때와 닫을 때의 체감이 맞는다.
 * 격자 셀(GridCard)도 여기서 가져다 쓴다 — 값이 갈라지면 닫힐 때만 스프링으로 튄다.
 */

/** 확대 + 뒤집기 520ms (동시 실행) */
export const FLIP_MS = 520;
/** cubic-bezier(0.22, 1, 0.36, 1) — 덱의 날아가기와 같은 이징 */
export const FLIP_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** 백드롭 페이드 200ms */
export const BACKDROP_MS = 200;
/** 3D 원근 */
export const PERSPECTIVE_PX = 1200;

/**
 * 폴백 스위치 — SPEC `<flip_interaction>`이 명시적으로 허용하는 폴백.
 *
 * 2026-09-12 실기기 확인 결과 **false로 확정.**
 * 회전이 "못생기고 약간 깜빡인다"는 판단이었다. 회전만 빠지고
 * 확대·백드롭·닫기·접근성은 그대로 동작한다. 깨진 3D보다 깔끔한 확대가 낫다.
 *
 * 되돌리려면 true로 바꾸면 된다 — 다른 파일은 손댈 필요 없다.
 */
export const FLIP_ENABLED = false;

/** 확대·뒤집기 공통 transition (motion) */
export const FLIP_TRANSITION = { duration: FLIP_MS / 1000, ease: FLIP_EASE } as const;

/** prefers-reduced-motion: 회전 없이 즉시 전환 */
export const INSTANT_TRANSITION = { duration: 0 } as const;
