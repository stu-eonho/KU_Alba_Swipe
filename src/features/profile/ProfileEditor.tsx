import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, EmptyState, Skeleton, Textarea, useToast } from '@/components/ui';
import { useSeekerProfile } from '@/hooks/useSeekerProfile';
import { useAuth } from '@/lib/auth-context';
import {
  MAX_PERSONALITY_TRAITS,
  MBTI_VALUES,
  PERSONALITY_TRAITS,
  type Mbti,
  type PersonalityTrait,
  type SeekerProfile,
} from '@/types';
import { ProfileAvatar } from './ProfileAvatar';
import { MAX_INTRO_LENGTH } from '@/lib/profile-limits';

const CATEGORIES = [
  '카페',
  '음식점',
  '편의점',
  '판매',
  '배달',
  '물류',
  '사무',
  '과외',
  '행사',
  '주방',
  '기타',
] as const;

type ExtendedProfile = SeekerProfile & {
  mbti?: Mbti | null;
  personalityTraits?: PersonalityTrait[];
};

export function ProfileEditor() {
  const { user } = useAuth();
  const profileQuery = useSeekerProfile();

  if (!user) return null;
  if (profileQuery.isLoading) return <ProfileSkeleton />;

  if (profileQuery.isError) {
    return (
      <EmptyState
        icon={<AlertCircle size={48} className="text-faint" aria-hidden />}
        title="프로필을 불러오지 못했어요"
        description="네트워크 상태를 확인하고 다시 시도해 주세요"
        actionLabel="다시 시도"
        actionVariant="secondary"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <ProfileForm
      key={profileQuery.profile?.updatedAt ?? user.id}
      nickname={user.nickname}
      profile={profileQuery.profile as ExtendedProfile | null}
      save={profileQuery.save}
      isSaving={profileQuery.isSaving}
    />
  );
}

function ProfileForm({
  nickname,
  profile,
  save,
  isSaving,
}: {
  nickname: string;
  profile: ExtendedProfile | null;
  save: ReturnType<typeof useSeekerProfile>['save'];
  isSaving: boolean;
}) {
  const toast = useToast();
  const [intro, setIntro] = useState(profile?.intro ?? '');
  const [experience, setExperience] = useState(profile?.experience ?? '');
  const [mbti, setMbti] = useState<Mbti | ''>(profile?.mbti ?? '');
  const [personalityTraits, setPersonalityTraits] = useState<PersonalityTrait[]>(
    profile?.personalityTraits ?? [],
  );
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [desiredWage, setDesiredWage] = useState(
    profile?.desiredWage !== null && profile?.desiredWage !== undefined
      ? String(profile.desiredWage)
      : '',
  );
  const [wageError, setWageError] = useState<string | null>(null);

  const toggleInterest = (category: string) => {
    setInterests((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const toggleTrait = (trait: PersonalityTrait) => {
    setPersonalityTraits((current) => {
      if (current.includes(trait)) return current.filter((item) => item !== trait);
      if (current.length >= MAX_PERSONALITY_TRAITS) return current;
      return [...current, trait];
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedWage = desiredWage ? Number(desiredWage) : null;
    if (
      parsedWage !== null &&
      (!Number.isInteger(parsedWage) || parsedWage < 0 || parsedWage > 1_000_000)
    ) {
      setWageError('희망 시급은 0원부터 1,000,000원 사이로 입력해 주세요');
      return;
    }

    setWageError(null);
    try {
      // A의 확장 patch가 합쳐지면 추가 필드도 저장된다. 변수로 넘겨 기존 Phase 2의
      // 좁은 타입과도 병렬 브랜치에서 호환되게 한다.
      const patch = {
        nickname,
        intro: intro.trim() || null,
        experience: experience.trim() || null,
        mbti: mbti || null,
        personalityTraits,
        interests,
        desiredWage: parsedWage,
      };
      await save(patch);
      toast.success('프로필을 저장했어요');
    } catch {
      toast.error('프로필을 저장하지 못했어요. 다시 시도해 주세요');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 py-5">
      <section className="border-line-soft flex items-center gap-4 border-b pb-5">
        <ProfileAvatar nickname={nickname} avatarUrl={profile?.avatarUrl} />
        <div className="min-w-0 flex-1">
          <h2 className="clamp-1 text-[18px] font-semibold text-ink">{nickname}</h2>
          <p className="mt-1 text-[13px] text-faint">구직자 프로필</p>
          <button
            type="button"
            disabled
            className="mt-2 min-h-11 text-[13px] font-semibold text-faint"
          >
            사진 변경 · 준비 중
          </button>
        </div>
      </section>

      <form onSubmit={handleSave} className="flex flex-col gap-5 py-5">
        <Textarea
          label="자기소개"
          value={intro}
          maxLength={MAX_INTRO_LENGTH}
          rows={6}
          onChange={(event) => setIntro(event.target.value.slice(0, MAX_INTRO_LENGTH))}
          hint={`${intro.length} / ${MAX_INTRO_LENGTH}`}
          placeholder="어떤 일을 해봤는지, 언제 일할 수 있는지 적어주세요"
        />

        <Textarea
          label="경력"
          value={experience}
          rows={5}
          onChange={(event) => setExperience(event.target.value)}
          placeholder="근무했던 곳과 맡았던 일을 적어주세요"
        />

        <div>
          <label
            htmlFor="profile-mbti"
            className="mb-1.5 block text-[14px] font-semibold text-muted"
          >
            MBTI
          </label>
          <select
            id="profile-mbti"
            value={mbti}
            onChange={(event) => setMbti(event.target.value as Mbti | '')}
            className="h-[52px] w-full rounded-field border border-line bg-surface px-4 text-[16px] text-ink outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/15"
          >
            <option value="">선택 안 함</option>
            {MBTI_VALUES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>

        <fieldset>
          <div className="mb-2 flex items-center justify-between">
            <legend className="text-[14px] font-semibold text-muted">나를 나타내는 성격</legend>
            <span className="tabular text-[12px] text-faint">
              {personalityTraits.length} / {MAX_PERSONALITY_TRAITS}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map((trait) => {
              const selected = personalityTraits.includes(trait);
              const disabled = !selected && personalityTraits.length >= MAX_PERSONALITY_TRAITS;
              return (
                <button
                  key={trait}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => toggleTrait(trait)}
                  className={
                    selected
                      ? 'min-h-11 rounded-pill border border-ink bg-brand-soft px-4 text-[14px] font-semibold text-ink'
                      : 'min-h-11 rounded-pill border border-line bg-surface px-4 text-[14px] text-muted disabled:opacity-40'
                  }
                >
                  {trait}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[14px] font-semibold text-muted">관심 직종</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const selected = interests.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleInterest(category)}
                  className={
                    selected
                      ? 'min-h-11 rounded-pill border border-ink bg-brand-soft px-4 text-[14px] font-semibold text-ink'
                      : 'min-h-11 rounded-pill border border-line bg-surface px-4 text-[14px] text-muted'
                  }
                >
                  {category}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="desired-wage"
            className="mb-1.5 block text-[14px] font-semibold text-muted"
          >
            희망 시급
          </label>
          <div className="relative">
            <input
              id="desired-wage"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={desiredWage}
              onChange={(event) => {
                setDesiredWage(event.target.value.replace(/[^0-9]/g, ''));
                setWageError(null);
              }}
              aria-invalid={Boolean(wageError)}
              aria-describedby={wageError ? 'desired-wage-error' : undefined}
              placeholder="예: 12000"
              className="h-[52px] w-full rounded-field border border-line bg-surface px-4 pr-10 text-[16px] text-ink outline-none placeholder:text-faint focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[14px] text-faint">
              원
            </span>
          </div>
          {wageError && (
            <p id="desired-wage-error" className="mt-1.5 text-[13px] text-error">
              {wageError}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" fullWidth loading={isSaving}>
          프로필 저장
        </Button>
      </form>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="p-4" role="status" aria-label="프로필을 불러오는 중">
      <div className="flex items-center gap-4 py-4">
        <Skeleton className="h-[72px] w-[72px] rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="mt-4 h-40" />
      <Skeleton className="mt-4 h-32" />
      <Skeleton className="mt-4 h-[52px]" />
    </div>
  );
}
