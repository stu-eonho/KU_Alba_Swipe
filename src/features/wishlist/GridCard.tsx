/**
 * OWNER: 개발자 B (screen-composer)
 *
 * ALBASWIPE_SPEC.md <wishlist_view><grid> — 격자 셀 앞면.
 *
 *  aspect-ratio 3/4 (셀 높이 고정) · radius 16px · bg surface · 보더 1px line-soft
 *  상단 45% 이미지(없으면 카테고리 그라디언트), 우상단 찜해제 IconButton(X 16px, scrim, 28px 원)
 *  하단 padding 12px: 가게명 14/700 ink 1줄 · 직종 Chip · 시급 18/800 brand · 요약 12px faint 2줄
 *
 * CRITICAL: 앞면에 보이는 4개 정보(가게명·직종·시급·요약)가 비교의 전부다.
 *           여기에 정보를 더 넣으면 4분할의 의미가 사라진다. 줄이지도, 늘리지도 말 것.
 *
 * CRITICAL: 셀 높이를 aspect-[3/4]로 고정하는 것이 이 화면의 전부다.
 *           카드마다 높이가 다르면 "한눈에 비교"가 무너진다.
 *
 * layoutId 계약: 기본값 `card-${job.id}`. deck-interaction의 확대·뒤집기가 이 값에 의존한다.
 *                값을 바꾸면 애니메이션이 에러 없이 조용히 죽는다.
 */
import clsx from 'clsx';
import { X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Chip, IconButton } from '@/components/ui';
import type { Job } from '@/types';
import { JobThumb, formatWage, jobAriaLabel } from './jobPresentation';
import { FLIP_TRANSITION, INSTANT_TRANSITION } from './flipMotion';

/** deck-interaction과 합의된 layoutId 규칙. 확대 카드도 같은 값을 써야 한다. */
export function gridCardLayoutId(jobId: string): string {
  return `card-${jobId}`;
}

export type GridCardProps = {
  job: Job;
  /**
   * motion 공유 레이아웃 id. 기본 `card-${job.id}`.
   * deck-interaction이 확대 카드에 같은 값을 주면 격자 셀 → 확대 카드 전환이 붙는다.
   */
  layoutId?: string;
  /** 셀 탭/Enter — 확대·뒤집기는 deck-interaction이 담당한다 */
  onClick?: (job: Job) => void;
  /** 우상단 X — 낙관적 찜 해제 */
  onUnwishlist?: (job: Job) => void;
  /** 확대 카드가 열려 있는 동안 원본 셀을 숨길 때(opacity만 사용, 레이아웃 영향 없음) */
  isExpanded?: boolean;
  className?: string;
};

export function GridCard({
  job,
  layoutId = gridCardLayoutId(job.id),
  onClick,
  onUnwishlist,
  isExpanded = false,
  className,
}: GridCardProps) {
  // 확대 카드가 닫힐 때 이 셀이 역방향 morph를 재생한다.
  // 확대 카드와 같은 transition을 써야 열 때와 닫을 때의 체감이 맞는다. (deck-interaction)
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      layoutId={layoutId}
      transition={prefersReduced ? INSTANT_TRANSITION : FLIP_TRANSITION}
      className={clsx(
        'rounded-tile border-line-soft bg-surface relative aspect-[3/4] w-full overflow-hidden border',
        isExpanded && 'opacity-0',
        className,
      )}
    >
      {/* 시각 콘텐츠. 읽기는 아래 버튼의 aria-label이 대신한다 */}
      <div aria-hidden className="pointer-events-none flex h-full w-full flex-col">
        <div className="bg-subtle h-[45%] w-full shrink-0 overflow-hidden">
          <JobThumb job={job} iconSize={24} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
          <p className="clamp-1 text-ink text-[14px] leading-[1.35] font-semibold">{job.storeName}</p>
          <div>
            <Chip variant="neutral" size="sm">
              {job.category}
            </Chip>
          </div>
          <p className="tabular text-ink text-[18px] leading-[1.2] font-semibold">
            {formatWage(job.hourlyWage)}
          </p>
          <p className="clamp-2 text-faint text-[12px] leading-[1.4]">{job.summary}</p>
        </div>
      </div>

      {/* 셀 전체가 하나의 버튼. 키보드 Tab으로도 열린다 */}
      <button
        type="button"
        onClick={() => onClick?.(job)}
        aria-label={`${jobAriaLabel(job)} 상세 보기`}
        className="rounded-tile absolute inset-0 z-10 h-full w-full"
      />

      {onUnwishlist && (
        <IconButton
          label="찜 해제"
          size={28}
          variant="scrim"
          onClick={() => onUnwishlist(job)}
          className="absolute top-2 right-2 z-20"
        >
          <X size={16} strokeWidth={2} aria-hidden />
        </IconButton>
      )}
    </motion.div>
  );
}
