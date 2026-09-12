/**
 * OWNER: 개발자 B (screen-composer)
 *
 * 빈 상태 3종 + 로딩 스켈레톤 2종. 흰 화면을 절대 보여주지 않기 위한 마감이다.
 * (스펙 success_criteria: "빈 흰 화면 노출 0회")
 *
 * 배치 주의: 덱 소진·에러 상태는 홈 덱에서도 쓰지만 `src/features/deck/`는
 * deck-interaction이 동시 작업 중이라 여기에 두고 export 한다.
 * 홈 덱에서 쓰려면:
 *   import { DeckExhaustedEmpty, LoadErrorState, DeckCardSkeleton } from '@/features/wishlist/emptyStates';
 *
 * 빈 상태는 아이콘 + 제목 + 설명 + CTA 4요소가 전부 있어야 한다. 하나라도 빠지면 미완성으로 보인다.
 */
import clsx from 'clsx';
import { Heart, SearchX, TriangleAlert, WifiOff } from 'lucide-react';
import { EmptyState, Skeleton } from '@/components/ui';

/**
 * 찜 목록 비었을 때 — ALBASWIPE_SPEC.md <wishlist_view><empty_state>
 * Heart 56px text-line / "아직 찜한 공고가 없어요" / "마음에 드는 공고는 오른쪽으로 넘겨보세요" / "공고 보러 가기" → /
 */
export function WishlistEmpty({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={<Heart size={56} strokeWidth={1.75} className="text-line" aria-hidden />}
      title="아직 찜한 공고가 없어요"
      description="마음에 드는 공고는 오른쪽으로 넘겨보세요"
      actionLabel="공고 보러 가기"
      actionTo="/"
      className={className}
    />
  );
}

/**
 * 덱 소진 — ALBASWIPE_SPEC.md <home_deck_view><empty_state>
 * SearchX 56px text-faint / "오늘 볼 공고를 다 봤어요!" / "찜한 공고를 비교해 보세요" / "찜 목록 보기" → /wishlist
 */
export function DeckExhaustedEmpty({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={<SearchX size={56} strokeWidth={1.75} className="text-faint" aria-hidden />}
      title="오늘 볼 공고를 다 봤어요!"
      description="찜한 공고를 비교해 보세요"
      actionLabel="찜 목록 보기"
      actionTo="/wishlist"
      className={className}
    />
  );
}

export type LoadErrorStateProps = {
  /** 기본 "공고를 불러오지 못했어요" */
  title?: string;
  /** 스펙 미기재 — 4요소를 채우려고 임의 작성 */
  description?: string;
  /** 기본 "다시 시도" */
  actionLabel?: string;
  onRetry?: () => void;
  className?: string;
};

/**
 * 에러 — ALBASWIPE_SPEC.md <home_deck_view><error_state>
 * WifiOff 48px / "공고를 불러오지 못했어요" / Button secondary "다시 시도"
 * (설명 문구는 스펙에 없어 임의 작성. 빈 상태 4요소를 채우기 위함)
 */
export function LoadErrorState({
  title = '공고를 불러오지 못했어요',
  description = '네트워크 상태를 확인하고 다시 시도해 주세요',
  actionLabel = '다시 시도',
  onRetry,
  className,
}: LoadErrorStateProps) {
  return (
    <EmptyState
      icon={<WifiOff size={48} strokeWidth={1.75} className="text-faint" aria-hidden />}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onRetry}
      actionVariant="secondary"
      className={className}
    />
  );
}

export type NotFoundStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  className?: string;
};

/**
 * 스펙 미기재: `/apply/:jobId`의 jobId가 목록에 없을 때의 화면. 임의 작성.
 * 근거: 라우터가 404 화면을 만들지 않기로 했으므로(`*` → `/`) 페이지 안에서 흡수한다.
 */
export function NotFoundState({
  title = '공고를 찾을 수 없어요',
  description = '이미 내려갔거나 주소가 잘못된 공고예요',
  actionLabel = '찜 목록으로',
  actionTo = '/wishlist',
  className,
}: NotFoundStateProps) {
  return (
    <EmptyState
      icon={<TriangleAlert size={48} strokeWidth={1.75} className="text-faint" aria-hidden />}
      title={title}
      description={description}
      actionLabel={actionLabel}
      actionTo={actionTo}
      actionVariant="secondary"
      className={className}
    />
  );
}

/**
 * 찜 격자 로딩 — ALBASWIPE_SPEC.md <wishlist_view><loading_state> "격자 모양 Skeleton 4개 (2x2)"
 * 격자와 동일한 padding 16px / gap 12px을 써야 로딩 → 완료 전환에서 레이아웃이 튀지 않는다.
 */
export function WishlistGridSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('p-4', className)} role="status" aria-label="찜한 공고를 불러오는 중">
      <Skeleton variant="grid" count={4} />
    </div>
  );
}

/**
 * 덱 카드 로딩 — ALBASWIPE_SPEC.md <home_deck_view><loading_state> "카드 모양 Skeleton 1장"
 * 카드 스택과 동일한 폭 규칙(`calc(100% - 32px)`, 최대 448px, 상단 16px).
 */
export function DeckCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="공고를 불러오는 중"
      className={clsx('mx-auto mt-4 w-[calc(100%-32px)] max-w-[448px]', className)}
    >
      <Skeleton variant="card" />
    </div>
  );
}
