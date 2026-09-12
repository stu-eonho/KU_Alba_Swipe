/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <home_deck_view><card_stack>:
 *   "image_url이 null이면 카테고리 기본 그라디언트 + 아이콘 48px rgba(255,255,255,0.5)"
 *
 * 스펙이 카테고리별 그라디언트 색을 지정하지 않아 **기존 토큰만 조합해** 만들었다.
 * hex 리터럴을 쓰지 않기 위해 var(--color-*)를 직접 참조한다. 새 색은 만들지 않았다.
 * 찜 격자(screen-composer)에서도 같은 함수를 쓰면 두 화면의 플레이스홀더가 일치한다.
 *
 * 직종 목록은 src/types.ts의 Job.category 주석을 따른다.
 */
import {
  Bike,
  Briefcase,
  ChefHat,
  Coffee,
  GraduationCap,
  Package,
  PartyPopper,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export type CategoryVisual = {
  /** CSS background-image 값 */
  gradient: string;
  Icon: LucideIcon;
};

const gradient = (from: string, to: string) => `linear-gradient(135deg, var(${from}), var(${to}))`;

const VISUALS: Record<string, CategoryVisual> = {
  카페: { gradient: gradient('--color-brand', '--color-brand-dark'), Icon: Coffee },
  음식점: { gradient: gradient('--color-star', '--color-brand'), Icon: UtensilsCrossed },
  편의점: { gradient: gradient('--color-like', '--color-like-deep'), Icon: Store },
  판매: { gradient: gradient('--color-brand', '--color-star'), Icon: ShoppingBag },
  배달: { gradient: gradient('--color-nope', '--color-star'), Icon: Bike },
  물류: { gradient: gradient('--color-muted', '--color-ink'), Icon: Package },
  사무: { gradient: gradient('--color-faint', '--color-muted'), Icon: Briefcase },
  과외: { gradient: gradient('--color-like-deep', '--color-ink'), Icon: GraduationCap },
  행사: { gradient: gradient('--color-star', '--color-like'), Icon: PartyPopper },
  주방: { gradient: gradient('--color-nope', '--color-brand'), Icon: ChefHat },
};

const FALLBACK: CategoryVisual = {
  gradient: gradient('--color-faint', '--color-muted'),
  Icon: Briefcase,
};

/** 직종 문자열 → 그라디언트 + 아이콘. 모르는 직종은 "기타"와 같은 중립 그라디언트. */
export function getCategoryVisual(category: string): CategoryVisual {
  return VISUALS[category] ?? FALLBACK;
}
