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
 * layout 애니메이션과 rotateY가 충돌해 카드가 찌그러지거나 깜빡이면
 * **이 한 줄을 false로 바꾼다.** 회전만 빠지고 확대·백드롭·닫기는 그대로 동작한다.
 * 깨진 3D보다 깔끔한 확대가 데모에서 낫다.
 */
export const FLIP_ENABLED = true;

/** 확대·뒤집기 공통 transition (motion) */
export const FLIP_TRANSITION = { duration: FLIP_MS / 1000, ease: FLIP_EASE } as const;

/** prefers-reduced-motion: 회전 없이 즉시 전환 */
export const INSTANT_TRANSITION = { duration: 0 } as const;
