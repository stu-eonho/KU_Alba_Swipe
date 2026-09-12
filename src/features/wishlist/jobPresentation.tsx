/**
 * OWNER: 개발자 B (screen-composer)
 *
 * 공고를 화면에 그릴 때 반복되는 조각들. 격자 셀 · 카드 뒷면 · 지원 화면이 공유한다.
 * (`src/components/`는 ui-foundation 소유라 여기 둔다. 공용으로 승격이 필요하면
 *  ui-foundation에게 요청할 것.)
 */
import { useState } from 'react';
import clsx from 'clsx';
import { ImageIcon } from 'lucide-react';
import { jobImageUrl } from '@/features/deck';
import type { Job } from '@/types';

/** 시급 표기 — 스펙 전역에서 "12,000원". tabular-nums는 호출부에서 `.tabular`로 준다. */
export function formatWage(hourlyWage: number): string {
  return `${hourlyWage.toLocaleString('ko-KR')}원`;
}

/** 근무 요일·시간 한 줄 — 예 "월·수·금 09:00 ~ 14:00" */
export function formatSchedule(job: Job): string {
  return `${job.workDays} ${job.workHours}`;
}

/** 스크린리더용 카드 라벨 — 스펙 <accessibility><screen_readers> */
export function jobAriaLabel(job: Job): string {
  return `${job.storeName}, ${job.category}, 시급 ${formatWage(job.hourlyWage)}`;
}

/**
 * image_url이 null일 때의 카테고리 기본 그라디언트.
 * 스펙 미기재: 카테고리별 정확한 색 조합. 새 hex를 만들지 않고 기존 토큰만 조합했다.
 */
const CATEGORY_GRADIENT: Record<string, string> = {
  카페: 'from-star to-brand',
  음식점: 'from-brand to-brand-dark',
  편의점: 'from-like to-like-deep',
  판매: 'from-brand to-star',
  배달: 'from-like-deep to-ink',
  물류: 'from-muted to-ink',
  사무: 'from-faint to-muted',
  과외: 'from-brand-dark to-ink',
  행사: 'from-star to-nope',
  주방: 'from-nope to-brand',
  기타: 'from-line to-faint',
};

export function categoryGradient(category: string): string {
  return CATEGORY_GRADIENT[category] ?? CATEGORY_GRADIENT['기타'];
}

export type JobThumbProps = {
  job: Job;
  /** 이미지가 없을 때 얹을 플레이스홀더 아이콘 크기(px) */
  iconSize?: number;
  className?: string;
};

/**
 * 공고 썸네일. 사진이 없으면 업종 기본 사진(`jobImageUrl`)을 쓰고,
 * 그마저 로드에 실패해야 카테고리 그라디언트 + 플레이스홀더 아이콘으로 내려간다.
 * 덱 카드와 같은 판단을 쓰므로 두 화면의 그림이 어긋나지 않는다.
 */
export function JobThumb({ job, iconSize = 24, className }: JobThumbProps) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={jobImageUrl(job)}
        alt={`${job.storeName} 사진`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={clsx('h-full w-full object-cover', className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        'bg-linear-to-br flex h-full w-full items-center justify-center',
        categoryGradient(job.category),
        className,
      )}
    >
      <ImageIcon
        size={iconSize}
        strokeWidth={1.75}
        className="text-on-image-faint"
        aria-hidden
      />
    </div>
  );
}
