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
import { Button, Textarea, useToast } from '@/components/ui';
import { useSeekerRating } from '@/hooks/useSeekerRating';

const SCORES = [1, 2, 3, 4, 5] as const;
const MAX_REASONS = 3;

type RatingReasonCode =
  | 'reliable'
  | 'relevant_experience'
  | 'communication'
  | 'schedule_fit'
  | 'friendly'
  | 'quick_learner'
  | 'teamwork'
  | 'other';

type RatingInput = {
  score: 1 | 2 | 3 | 4 | 5;
  reasons: RatingReasonCode[];
  otherReason: string | null;
};

const REASONS: ReadonlyArray<{ code: RatingReasonCode; label: string }> = [
  { code: 'reliable', label: '성실하고 책임감 있어요' },
  { code: 'relevant_experience', label: '관련 경험이 있어요' },
  { code: 'communication', label: '소통이 원활해요' },
  { code: 'schedule_fit', label: '근무 시간이 잘 맞아요' },
  { code: 'friendly', label: '친절해요' },
  { code: 'quick_learner', label: '업무 습득이 빨라요' },
  { code: 'teamwork', label: '협업을 잘해요' },
  { code: 'other', label: '기타' },
];
const LEGACY_MARKER = 'albaswipe-rating:v1:';
const REASON_CODES = new Set<RatingReasonCode>(REASONS.map((item) => item.code));

function parseLegacyComment(value: string | null | undefined): {
  reasons: RatingReasonCode[];
  otherReason: string;
} | null {
  if (!value?.startsWith(LEGACY_MARKER)) return null;
  try {
    const parsed: unknown = JSON.parse(value.slice(LEGACY_MARKER.length));
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (!Array.isArray(record.reasons)) return null;
    const reasons = record.reasons.filter(
      (reason): reason is RatingReasonCode =>
        typeof reason === 'string' && REASON_CODES.has(reason as RatingReasonCode),
    );
    const otherReason = typeof record.otherReason === 'string' ? record.otherReason : '';
    return { reasons: reasons.slice(0, MAX_REASONS), otherReason };
  } catch {
    return null;
  }
}

export type SeekerRatingProps = {
  /** 평가 대상 구직자의 user id. 없으면 훅이 쿼리를 돌리지 않는다 */
  seekerId?: string;
  className?: string;
};

export function SeekerRating({ seekerId, className }: SeekerRatingProps) {
  type RatingHookState = {
    avg: number;
    count: number;
    myScore: number | null;
    myComment?: string | null;
    myReasons?: RatingReasonCode[];
    myOtherReason?: string | null;
    rate: unknown;
    isRating: boolean;
  };
  const rating = useSeekerRating(seekerId) as unknown as RatingHookState;
  const { avg, count, myScore, isRating } = rating;
  const toast = useToast();
  const legacyDraft = parseLegacyComment(rating.myComment);
  const sourceReasons: RatingReasonCode[] =
    rating.myReasons ?? legacyDraft?.reasons ?? (rating.myComment?.trim() ? ['other'] : []);
  const sourceOther = rating.myOtherReason ?? legacyDraft?.otherReason ?? rating.myComment ?? '';
  const sourceKey = `${myScore ?? 0}|${sourceReasons.join(',')}|${sourceOther}`;
  const [draft, setDraft] = useState<{
    sourceKey: string;
    score: number;
    reasons: RatingReasonCode[];
    otherReason: string;
  }>(() => ({ sourceKey: '', score: 0, reasons: [], otherReason: '' }));
  const current =
    draft.sourceKey === sourceKey
      ? draft
      : { sourceKey, score: myScore ?? 0, reasons: sourceReasons, otherReason: sourceOther };
  const otherInvalid = current.reasons.includes('other') && current.otherReason.trim().length < 2;
  const canSave =
    Boolean(seekerId) &&
    !isRating &&
    current.score >= 1 &&
    current.score <= 5 &&
    current.reasons.length >= 1 &&
    current.reasons.length <= MAX_REASONS &&
    !otherInvalid;

  const update = (next: Partial<Omit<typeof current, 'sourceKey'>>) =>
    setDraft({ ...current, ...next, sourceKey });

  const toggleReason = (code: RatingReasonCode) => {
    if (current.reasons.includes(code)) {
      update({
        reasons: current.reasons.filter((item) => item !== code),
        ...(code === 'other' ? { otherReason: '' } : {}),
      });
      return;
    }
    if (current.reasons.length >= MAX_REASONS) return;
    update({ reasons: [...current.reasons, code] });
  };

  const handleSave = async () => {
    if (!canSave) return;
    const input: RatingInput = {
      score: current.score as RatingInput['score'],
      reasons: current.reasons,
      otherReason: current.reasons.includes('other') ? current.otherReason.trim() : null,
    };
    try {
      if (Array.isArray(rating.myReasons)) {
        const structuredRate = rating.rate as (value: RatingInput) => Promise<unknown>;
        await structuredRate(input);
      } else {
        const legacyRate = rating.rate as (score: number, comment?: string) => Promise<unknown>;
        await legacyRate(input.score, `${LEGACY_MARKER}${JSON.stringify(input)}`);
      }
      toast.success('평가를 저장했어요');
    } catch {
      toast.error('평가를 저장하지 못했어요');
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
            aria-pressed={current.score === score}
            disabled={!seekerId || isRating}
            onClick={() => update({ score })}
            className="press-scale inline-flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-60"
          >
            <Star
              size={28}
              strokeWidth={1.75}
              className={clsx(score <= current.score ? 'text-star fill-star' : 'text-line')}
              aria-hidden
            />
          </button>
        ))}
      </div>

      <fieldset className="mt-4">
        <legend className="text-[14px] font-semibold text-ink">왜 그렇게 평가했나요?</legend>
        <p className="mt-1 text-[12px] text-faint">최대 {MAX_REASONS}개까지 선택할 수 있어요</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REASONS.map(({ code, label }) => {
            const selected = current.reasons.includes(code);
            const disabled = isRating || (!selected && current.reasons.length >= MAX_REASONS);
            return (
              <button
                key={code}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => toggleReason(code)}
                className={clsx(
                  'min-h-11 rounded-full border px-3 text-[13px] font-medium transition-colors disabled:opacity-40',
                  selected
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-line bg-surface text-muted',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {current.reasons.includes('other') && (
        <Textarea
          label="기타 사유"
          value={current.otherReason}
          onChange={(event) => update({ otherReason: event.target.value })}
          maxLength={100}
          placeholder="예: 장기 근무 가능 여부를 확인하고 싶어요"
          error={
            current.otherReason.length > 0 && otherInvalid
              ? '기타 사유를 2자 이상 입력해 주세요'
              : undefined
          }
          hint={current.otherReason.length === 0 ? '2~100자로 입력해 주세요' : undefined}
          className="min-h-24"
          containerClassName="mt-3"
        />
      )}

      <Button
        fullWidth
        className="mt-4"
        disabled={!canSave}
        loading={isRating}
        onClick={() => void handleSave()}
      >
        평가 저장
      </Button>

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
