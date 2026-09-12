/**
 * OWNER: 개발자 B (screen-composer)
 *
 * ALBASWIPE_SPEC.md <back_face> — 확대된 카드의 뒷면 "콘텐츠"만 담당한다.
 * 확대·뒤집기(rotateY, layoutId, 백드롭, Escape 처리)는 deck-interaction 소유다.
 *
 * 스펙 순서 그대로:
 *   우상단 닫기(X 20px faint) → 가게명 20/700 → 평점 행 → 시급 24/800
 *   → 구분선 → "근무 조건" → "가게 주소" → "상세 내용" → "리뷰" 2~3개
 *   → 하단 고정 "지원하기" Button primary lg → /apply/:jobId
 *
 * 내부만 스크롤한다(flex-1 + min-h-0 + overflow-y-auto). 바깥은 고정.
 *
 * CRITICAL: description·리뷰 본문은 `white-space: pre-wrap` 플레인 텍스트로 렌더한다.
 *           HTML 주입 API(dangerously* 계열)를 쓰지 않는다.
 */
import clsx from 'clsx';
import { Clock, MapPin, Star, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, IconButton } from '@/components/ui';
import { useApply } from '@/hooks/useApply';
import { useSeekerProfile } from '@/hooks/useSeekerProfile';
import type { Job, Review } from '@/types';
import { formatWage } from './jobPresentation';

export type BackFaceProps = {
  job: Job;
  /**
   * 노출할 리뷰. 호출부가 useReviews(job.id)로 받아 넘긴다.
   * 비어 있으면 리뷰 섹션을 그리지 않는다 — 목데이터로 폴백하면 실제 공고에
   * 가짜 리뷰가 붙어 데모에서 사실을 왜곡한다.
   */
  reviews?: Review[];
  /** 우상단 X. 주지 않으면 닫기 버튼을 렌더하지 않는다(뒤집기 컨테이너가 직접 그릴 때) */
  onClose?: () => void;
  /** 지원하기를 누르기 직전에 실행. 보통 확대 카드를 닫는다 */
  onBeforeApply?: () => void;
  /** 지원 상세처럼 읽기 전용으로 쓸 때 false. 기본값은 기존과 같은 true */
  showApply?: boolean;
  className?: string;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-ink text-[14px] leading-[1.4] font-semibold">{children}</h3>;
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <li className="bg-app rounded-lg p-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-ink text-[13px] leading-[1.3] font-semibold">
          {review.authorName}
        </span>
        <span className="text-star inline-flex items-center gap-0.5 text-[12px] leading-[1.3] font-semibold">
          <Star size={12} strokeWidth={2} className="fill-star" aria-hidden />
          <span className="tabular">{review.rating.toFixed(1)}</span>
        </span>
      </div>
      <p className="clamp-3 text-muted mt-1 text-[13px] leading-[1.5] whitespace-pre-wrap">
        {review.content}
      </p>
    </li>
  );
}

export function BackFace({
  job,
  reviews,
  onClose,
  onBeforeApply,
  showApply = true,
  className,
}: BackFaceProps) {
  const list = reviews ?? [];

  return (
    <div
      className={clsx('bg-surface relative flex h-full w-full flex-col overflow-hidden', className)}
    >
      {onClose && (
        <IconButton
          label="닫기"
          size={40}
          variant="plain"
          onClick={onClose}
          className="text-faint absolute top-1.5 right-1.5 z-10"
        >
          <X size={20} strokeWidth={2} aria-hidden />
        </IconButton>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
        <header className="space-y-1.5 pr-10">
          <h2 className="text-ink text-[18px] leading-[1.3] font-semibold">{job.storeName}</h2>

          <div className="flex items-center gap-1.5">
            <Star size={16} strokeWidth={2} className="text-star fill-star" aria-hidden />
            <span className="tabular text-ink text-[15px] leading-[1.3] font-semibold">
              {job.rating.toFixed(1)}
            </span>
            <span className="text-faint text-[13px] leading-[1.3]">리뷰 {job.reviewCount}개</span>
          </div>

          <p className="tabular text-ink text-[18px] leading-[1.2] font-semibold">
            {formatWage(job.hourlyWage)}
          </p>
        </header>

        <hr className="border-line-soft border-t" />

        <section className="space-y-2">
          <SectionTitle>근무 조건</SectionTitle>
          <dl className="space-y-1 text-[14px] leading-[1.5]">
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">근무 요일</dt>
              <MapPin size={14} strokeWidth={1.75} className="text-faint shrink-0" aria-hidden />
              <dd className="text-body">{job.workDays}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">근무 시간</dt>
              <Clock size={14} strokeWidth={1.75} className="text-faint shrink-0" aria-hidden />
              <dd className="text-body tabular">{job.workHours}</dd>
            </div>
          </dl>
          {job.benefits.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {job.benefits.map((benefit) => (
                <li key={benefit}>
                  <Chip variant="success" size="md">
                    {benefit}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
        </section>

        <WantedTraitsSection job={job} />

        <section className="space-y-1.5">
          <SectionTitle>가게 주소</SectionTitle>
          <p className="text-body text-[14px] leading-[1.5]">{job.address}</p>
        </section>

        <section className="space-y-1.5">
          <SectionTitle>상세 내용</SectionTitle>
          {/* CRITICAL: pre-wrap 플레인 텍스트로만 렌더한다 (HTML 주입 금지) */}
          <p className="text-body text-[14px] leading-[1.7] whitespace-pre-wrap">
            {job.description}
          </p>
        </section>

        <section className="space-y-2">
          <SectionTitle>리뷰</SectionTitle>
          {list.length > 0 ? (
            <ul className="space-y-2">
              {list.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </ul>
          ) : (
            <p className="text-faint text-[13px] leading-[1.5]">아직 등록된 리뷰가 없어요.</p>
          )}
        </section>
      </div>

      {showApply && <ApplicationFooter job={job} onBeforeApply={onBeforeApply} />}
    </div>
  );
}

/**
 * "이런 분을 찾아요" — 사장님이 고른 성격 키워드(job.wantedTraits).
 *
 * 내 프로필 성격과 겹치는 칩은 brand-soft 배경으로 강조한다. 이 화면에서
 * "성격이 맞는 가게"가 눈에 보이는 유일한 지점이다.
 *
 * wantedTraits 는 optional 이다(마이그레이션 전 행 대비). 비어 있으면 섹션 자체를
 * 그리지 않는다 — 빈 제목만 남으면 정보가 없는 게 아니라 고장난 것처럼 보인다.
 */
function WantedTraitsSection({ job }: { job: Job }) {
  const { profile } = useSeekerProfile();
  const wanted = job.wantedTraits ?? [];

  if (wanted.length === 0) return null;

  const mine = new Set<string>(profile?.personalityTraits ?? []);
  const matchCount = wanted.filter((trait) => mine.has(trait)).length;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-1.5">
        <SectionTitle>이런 분을 찾아요</SectionTitle>
        {matchCount > 0 && (
          <span className="text-brand text-[12px] leading-[1.3] font-semibold">
            <span className="tabular">{matchCount}</span>개 일치
          </span>
        )}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {wanted.map((trait) => {
          const matched = mine.has(trait);
          return (
            <li key={trait}>
              <Chip
                size="md"
                /* Chip 기본 variant(bg-subtle/text-muted) 위에 덮어쓴다.
                   같은 속성끼리는 클래스 순서가 아니라 CSS 생성 순서로 이기므로
                   `!`로 못 박는다 — 토큰은 그대로 쓴다(hex 없음). */
                className={matched ? 'bg-brand-soft! text-brand!' : undefined}
              >
                {matched ? <span className="sr-only">내 성격과 일치: </span> : null}
                {trait}
              </Chip>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ApplicationFooter({ job, onBeforeApply }: { job: Job; onBeforeApply?: () => void }) {
  const navigate = useNavigate();
  const { existingApplication, isChecking, isCheckError, retryCheck } = useApply(job.id);

  const go = (to: string) => {
    onBeforeApply?.();
    navigate(to);
  };

  return (
    <div className="border-line-soft bg-surface shrink-0 border-t p-4">
      {isChecking ? (
        <Button size="lg" fullWidth disabled>
          지원 여부 확인 중
        </Button>
      ) : isCheckError ? (
        <Button variant="secondary" size="lg" fullWidth onClick={() => void retryCheck()}>
          다시 확인
        </Button>
      ) : existingApplication ? (
        <div className="flex flex-col gap-2">
          <Button size="lg" fullWidth disabled>
            지원 완료
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => go(`/settings/applications/${existingApplication.id}`)}
          >
            지원 내용 보기
          </Button>
        </div>
      ) : (
        <Button size="lg" fullWidth onClick={() => go(`/apply/${job.id}`)}>
          지원하기
        </Button>
      )}
    </div>
  );
}
