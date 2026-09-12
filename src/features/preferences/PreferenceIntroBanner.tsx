/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * PHASE8 G8 · 초기 취향 선택.
 *
 * A 가 `usePreferences` · `recommend.ts` · `user_preferences` 를 다 만들어 뒀지만
 * 화면이 없어서, 추천이 **스와이프를 몇 번 쌓아야만** 동작했다. 첫 진입에서
 * 관심 업종만 골라 두면 첫 카드부터 취향 순으로 나온다.
 *
 * 배너를 띄우는 조건은 하나뿐이다 — **가중치가 비어 있을 때.**
 * 스와이프를 하든 여기서 고르든 가중치가 생기면 배너는 스스로 사라진다.
 * 닫기(X)는 localStorage 에 기억한다(기기별로 다른 편이 맞고, 서버에 둘 값이 아니다).
 *
 * 없어도 앱이 도는 기능이라 실패는 전부 조용히 넘어간다.
 */
import { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { usePreferences } from '@/hooks/usePreferences';
import { PreferencePickerSheet } from './PreferencePickerSheet';

export const PREFERENCE_INTRO_DISMISS_KEY = 'albaswipe.preferenceIntroDismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(PREFERENCE_INTRO_DISMISS_KEY) === '1';
  } catch {
    // 시크릿 모드에서는 접근 자체가 throw 한다. 못 읽으면 안 닫은 것으로 본다.
    return false;
  }
}

function writeDismissed(): void {
  try {
    localStorage.setItem(PREFERENCE_INTRO_DISMISS_KEY, '1');
  } catch {
    // 이번 세션 동안만 닫힌 상태로 남는다. 사용자에게 알릴 일이 아니다.
  }
}

export function PreferenceIntroBanner() {
  const { weights, isLoading, setInitial } = usePreferences();
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());
  const [sheetOpen, setSheetOpen] = useState(false);

  const dismiss = useCallback(() => {
    setDismissed(true);
    writeDismissed();
  }, []);

  const apply = useCallback(
    (keys: string[]) => {
      if (keys.length > 0) setInitial(keys);
      setSheetOpen(false);
    },
    [setInitial],
  );

  // 읽는 중에 띄우면 이미 취향이 있는 사용자에게 배너가 한 번 깜빡인다.
  const hasWeights = Object.keys(weights).length > 0;
  if (isLoading || hasWeights || dismissed) return null;

  return (
    <>
      <div className="flex min-h-11 items-center gap-2 px-4">
        <p className="text-faint min-w-0 flex-1 truncate text-[12px] leading-[1.35]">
          관심 업종을 고르면 더 잘 맞는 공고부터 보여드려요
        </p>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="text-muted inline-flex h-11 shrink-0 items-center px-1 text-[12px] leading-[1.35] font-medium underline underline-offset-2 transition-transform duration-100 ease-out active:scale-[0.97]"
        >
          고르기
        </button>
        <button
          type="button"
          aria-label="관심 업종 안내 닫기"
          onClick={dismiss}
          className="text-faint active:bg-subtle -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-transform duration-100 ease-out select-none active:scale-[0.97]"
        >
          <X size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <PreferencePickerSheet open={sheetOpen} onApply={apply} onClose={() => setSheetOpen(false)} />
    </>
  );
}
