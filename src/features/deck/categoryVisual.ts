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

/**
 * image_url이 비어 있을 때 대신 쓰는 업종별 기본 사진.
 *
 * 그라디언트 + 아이콘만 있으면 "사진을 못 불러왔다"처럼 보인다는 피드백을 받았다.
 * 공고를 직접 올린 구인자가 사진을 빼먹어도 카드가 비어 보이지 않게 한다.
 *
 * URL은 전부 시드가 이미 쓰고 있어 200을 확인한 것들이고, 나머지 셋(배달·과외·기타)도
 * 같은 방식으로 응답을 확인했다. 외부 이미지이므로 로드 실패 시에는
 * getCategoryVisual()의 그라디언트로 되돌아가야 한다 — 호출부가 onError를 걸 것.
 */
const UNSPLASH = (id: string) => `https://images.unsplash.com/${id}?w=600`;

const CATEGORY_IMAGE: Record<string, string> = {
  카페: UNSPLASH('photo-1501339847302-ac426a4a7cbb'),
  음식점: UNSPLASH('photo-1546069901-ba9599a7e63c'),
  편의점: UNSPLASH('photo-1604719312566-8912e9227c6a'),
  판매: UNSPLASH('photo-1441986300917-64674bd600d8'),
  배달: UNSPLASH('photo-1526367790999-0150786686a2'),
  물류: UNSPLASH('photo-1566576912321-d58ddd7a6088'),
  사무: UNSPLASH('photo-1497633762265-9d179a990aa6'),
  과외: UNSPLASH('photo-1522202176988-66273c2fd55f'),
  행사: UNSPLASH('photo-1528698827591-e19ccd7bc23d'),
  주방: UNSPLASH('photo-1414235077428-338989a2e8c0'),
  기타: UNSPLASH('photo-1497215728101-856f4ea42174'),
};

/** 업종 기본 사진. 모르는 업종은 '기타' 사진으로 떨어진다. */
export function categoryImage(category: string): string {
  return CATEGORY_IMAGE[category] ?? CATEGORY_IMAGE['기타'];
}

/** 카드가 실제로 그릴 사진 주소. 공고 사진이 없으면 업종 기본 사진. */
export function jobImageUrl(job: { imageUrl: string | null; category: string }): string {
  return job.imageUrl || categoryImage(job.category);
}
