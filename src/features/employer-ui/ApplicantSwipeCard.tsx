/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * PHASE4_PLAN.md B-1 · 지원자 스와이프 덱 "카드 레이아웃"
 *
 * 지원자 1명을 덱 카드 한 장으로 그린다. `SwipeCard`와 같은 박스(aspect-[3/4] ·
 * rounded-card · 헤어라인 · 그림자 없음)라서 같은 스택에 그대로 들어간다.
 *
 * 순수 프레젠테이션이다. 제스처·스와이프·상태 변경은 여기 없다 —
 * 나중에 CardStack이 이 컴포넌트를 감싸며 transform을 소유한다.
 *
 * 사용자 요청: "사용자 사진은 좀 작게하고 자기소개 등 보이게끔"
 *   → 아바타는 56px로 줄이고, 자기소개가 카드에서 가장 큰 영역을 먹는다.
 */
import clsx from 'clsx';
import { Chip } from '@/components/ui';
import { ProfileAvatar } from '@/features/profile';
import type { ApplicantEntry } from '@/types';
import { formatApplicationDate } from './applicationPresentation';

/** 칩 줄이 두 줄로 늘어나면 고정 높이가 깨진다. 각 줄 최대 개수를 못 박는다. */
const MAX_TRAITS = 3;
const MAX_INTERESTS = 3;

export type ApplicantSwipeCardProps = {
  entry: ApplicantEntry;
  className?: string;
};

export function ApplicantSwipeCard({ entry, className }: ApplicantSwipeCardProps) {
  const { seeker, job, createdAt } = entry;
  const profile = seeker.profile;

  const traits = (profile?.personalityTraits ?? []).slice(0, MAX_TRAITS);
  const interests = profile?.interests ?? [];
  const shownInterests = interests.slice(0, MAX_INTERESTS);
  const restInterests = interests.length - shownInterests.length;

  const wage =
    profile?.desiredWage != null ? `${profile.desiredWage.toLocaleString('ko-KR')}원` : '시급 협의';

  return (
    <div
      role="article"
      aria-label={`${seeker.nickname} 지원자 카드`}
      className={clsx(
        'bg-surface border-line-soft rounded-card flex aspect-[3/4] w-full flex-col overflow-hidden border p-4 select-none',
        className,
      )}
    >
      {/* 상단 — 아바타는 작게, 이름과 지원 공고만 */}
      <div className="flex shrink-0 items-center gap-3">
        <ProfileAvatar nickname={seeker.nickname} avatarUrl={profile?.avatarUrl} size={56} />
        <div className="min-w-0 flex-1">
          <p className="clamp-1 text-[18px] leading-tight font-semibold text-ink">
            {seeker.nickname}
          </p>
          <p className="clamp-1 mt-1 text-[12px] text-faint">{job.storeName} 지원</p>
        </div>
      </div>

      {profile ? (
        <>
          {/* 본문 — 카드에서 가장 큰 영역. 남는 공간을 전부 먹고, 넘치면 잘린다 */}
          <div className="mt-4 min-h-0 flex-1 overflow-hidden">
            {profile.intro ? (
              <p className="line-clamp-5 text-[16px] leading-relaxed whitespace-pre-wrap text-body">
                {profile.intro}
              </p>
            ) : (
              <p className="text-[16px] leading-relaxed text-faint">자기소개가 없어요</p>
            )}
          </div>

          {/* 경력 */}
          {profile.experience && (
            <p className="mt-3 line-clamp-2 shrink-0 text-[14px] leading-snug whitespace-pre-wrap text-body">
              {profile.experience}
            </p>
          )}

          {/* 칩 1행 — MBTI + 성격 키워드 */}
          {(profile.mbti || traits.length > 0) && (
            <div className="mt-3 flex shrink-0 gap-1.5 overflow-hidden">
              {profile.mbti && <Chip>{profile.mbti}</Chip>}
              {traits.map((trait) => (
                <Chip key={trait}>{trait}</Chip>
              ))}
            </div>
          )}

          {/* 칩 2행 — 관심 직종 */}
          {shownInterests.length > 0 && (
            <div className="mt-1.5 flex shrink-0 gap-1.5 overflow-hidden">
              {shownInterests.map((interest) => (
                <Chip key={interest}>{interest}</Chip>
              ))}
              {restInterests > 0 && <Chip>+{restInterests}</Chip>}
            </div>
          )}
        </>
      ) : (
        /* 프로필을 아직 안 만든 지원자. 카드가 깨지지 않게 자리만 채운다 */
        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <p className="text-[14px] leading-relaxed text-faint">프로필을 아직 작성하지 않았어요</p>
        </div>
      )}

      {/* 하단 — 희망 시급 · 지원일 */}
      <div className="border-line-soft mt-3 flex shrink-0 items-baseline justify-between gap-2 border-t pt-3">
        <span className="tabular clamp-1 text-[14px] font-semibold text-ink">{wage}</span>
        <span className="shrink-0 text-[12px] text-faint">
          {formatApplicationDate(createdAt)} 지원
        </span>
      </div>
    </div>
  );
}
