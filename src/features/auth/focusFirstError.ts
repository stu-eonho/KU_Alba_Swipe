/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 제출이 실패했을 때 첫 오류 필드로 스크롤하고 포커스를 옮깁니다.
 *
 * 긴 폼에서 맨 아래 버튼을 눌렀는데 오류가 화면 밖 위쪽에 있으면, 사용자에게는
 * 버튼이 그냥 안 눌린 것처럼 보입니다. 무엇이 잘못됐는지 찾으러 직접 올라가야 합니다.
 *
 * 새 스크롤 라이브러리를 쓰지 않고 브라우저 scrollIntoView 만 씁니다.
 */

/** 필드 래퍼는 form-primitives 의 `data-field` 로 표시돼 있습니다. */
export function focusFirstError(order: string[], errors: Record<string, string | undefined>) {
  const firstKey = order.find((key) => errors[key]);
  if (!firstKey) return;

  /*
   * 오류 state 가 그려진 뒤에 찾아야 합니다. 같은 tick 에서 querySelector 하면
   * 아직 에러 문구도 aria 속성도 DOM 에 없습니다.
   */
  requestAnimationFrame(() => {
    const wrapper = document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
    if (!wrapper) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    wrapper.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });

    /*
     * 래퍼 안의 첫 입력 요소에 포커스를 줍니다. 요일 토글처럼 input 이 없는
     * 묶음은 첫 버튼을 잡습니다 — 포커스가 어디에도 안 가면 스크린리더 사용자는
     * 여전히 무엇이 잘못됐는지 모릅니다.
     */
    const control = wrapper.querySelector<HTMLElement>(
      'input:not([type="hidden"]), select, textarea, button[aria-pressed]',
    );
    control?.focus({ preventScroll: true });
  });
}
