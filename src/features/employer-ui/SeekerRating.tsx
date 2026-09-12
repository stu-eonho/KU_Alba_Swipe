/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * Phase 7 · 지원자 평점 UI.
 *
 * 데이터는 개발자 A의 `useSeekerRating(seekerId)`가 전부 가지고 있다.
 * 여기는 그 훅을 화면에 붙이는 껍데기다 — 별 5개 입력 + 평균 한 줄.
 *
 *   <SeekerRating seekerId={entry.seeker.id} />         // 입력 + 평균 (지원자 상세)
 *   <SeekerRatingSummary seekerId={entry.seeker.id} />  // 평균만 (스와이프 카드)
 *
 * rate()는 upsert다. (employer_id, seeker_id)가 PK라 다시 매기면 덮어쓴다.
 * "이미 줬으니 못 바꿔요" 같은 잠금은 넣지 않는다 — DB가 그렇게 동작하지 않는다.
 *
 * 색: 별은 `text-star`(#ff4848 · Upvote Red). 레드 CTA(`bg-brand`)와는 다른 토큰이고,
 *     평점·좋아요 카운트 전용이라 "레드는 CTA 전용" 원칙과 충돌하지 않는다.
 */
import { useState } from 'react';
import clsx from 'clsx';
import { Star } from 'lucide-react';
import { useToast } from '@/components/ui';
import { useSeekerRating } from '@/hooks/useSeekerRating';

const SCORES = [1, 2, 3, 4, 5] as const;

export type SeekerRatingProps = {
  /** 평가 대상 구직자의 user id. 없으면 훅이 쿼리를 돌리지 않는다 */
  seekerId?: string;
  className?: string;
};

export function SeekerRating({ seekerId, className }: SeekerRatingProps) {
  const { avg, count, myScore, rate, isRating } = useSeekerRating(seekerId);
  const toast = useToast();
  /** 저장 왕복 동안 별이 비어 보이지 않게 눌린 점수를 잠깐 들고 있는다 */
  const [pending, setPending] = useState<number | null>(null);

  const filled = pending ?? myScore ?? 0;

  const handleRate = async (score: number) => {
    if (!seekerId || isRating) return;
    setPending(score);
    try {
      await rate(score);
      toast.success('평점을 남겼어요');
    } catch {
      setPending(null);
      toast.error('평점을 저장하지 못했어요');
    }
  };

  return (
    <div className={className}>
      <div role="group" aria-label="지원자 평점" className="flex items-center -ml-2.5">
        {SCORES.map((score) => (
          <button
            key={score}
            type="button"
            aria-label={`${score}점 주기`}
            aria-pressed={filled === score}
            disabled={!seekerId || isRating}
            onClick={() => void handleRate(score)}
            className="press-scale inline-flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-60"
          >
            <Star
              size={28}
              strokeWidth={1.75}
              className={clsx(score <= filled ? 'text-star fill-star' : 'text-line')}
              aria-hidden
            />
          </button>
        ))}
      </div>

      <p className="mt-1 text-[13px] leading-[1.4] text-faint">
        {count === 0 ? (
          '아직 평점이 없어요'
        ) : (
          <>
            평균 <span className="tabular">{avg.toFixed(1)}</span> ·{' '}
            <span className="tabular">{count}</span>명
          </>
        )}
      </p>
    </div>
  );
}

/**
 * 평균만 작게 보여주는 읽기 전용 줄. 스와이프 카드용이다 —
 * 스와이프 중에 별을 누를 일이 없으므로 입력은 일부러 뺐다.
 * 평점이 하나도 없으면 아무것도 그리지 않는다.
 */
export function SeekerRatingSummary({ seekerId, className }: SeekerRatingProps) {
  const { avg, count } = useSeekerRating(seekerId);

  if (count === 0) return null;

  return (
    <span
      className={clsx('text-star inline-flex items-center gap-0.5', className)}
      aria-label={`지원자 평점 평균 ${avg.toFixed(1)}점, ${count}명`}
    >
      <Star size={12} strokeWidth={2} className="fill-star" aria-hidden />
      <span className="tabular text-[12px] leading-[1.3] font-semibold">{avg.toFixed(1)}</span>
    </span>
  );
}
