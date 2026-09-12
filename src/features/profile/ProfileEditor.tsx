import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw, Settings } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui';
import { useMyApplications } from '@/hooks/useApply';
import { useSeekerProfile } from '@/hooks/useSeekerProfile';
import { useAuth } from '@/lib/auth-context';
import type { ApplicationStatus, SeekerProfile } from '@/types';
import { ProfileAvatar } from './ProfileAvatar';

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

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: '지원 완료',
  viewed: '열람',
  accepted: '채용 확정',
  rejected: '지원 종료',
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
      profile={profileQuery.profile}
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
  profile: SeekerProfile | null;
  save: ReturnType<typeof useSeekerProfile>['save'];
  isSaving: boolean;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const {
    applications,
    isLoading: applicationsLoading,
    isError: applicationsError,
  } = useMyApplications();
  const [intro, setIntro] = useState(profile?.intro ?? '');
  const [experience, setExperience] = useState(profile?.experience ?? '');
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

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedWage = desiredWage.trim();
    const parsedWage = trimmedWage ? Number(trimmedWage) : null;
    if (parsedWage !== null && (!Number.isInteger(parsedWage) || parsedWage < 0)) {
      setWageError('희망 시급은 0 이상의 숫자로 입력해 주세요');
      return;
    }

    setWageError(null);
    try {
      await save({
        nickname,
        intro: intro.trim() || null,
        experience: experience.trim() || null,
        interests,
        desiredWage: parsedWage,
      });
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
          maxLength={500}
          rows={6}
          onChange={(event) => setIntro(event.target.value.slice(0, 500))}
          hint={`${intro.length} / 500`}
          placeholder="어떤 일을 해봤는지, 언제 일할 수 있는지 적어주세요"
        />

        <Textarea
          label="경력"
          value={experience}
          rows={5}
          onChange={(event) => setExperience(event.target.value)}
          placeholder="근무했던 곳과 맡았던 일을 적어주세요"
        />

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
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              value={desiredWage}
              onChange={(event) => {
                setDesiredWage(event.target.value);
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

      <section className="border-line-soft border-t py-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-ink">내 지원 현황</h2>
          <div className="flex items-center gap-1">
            <span className="text-[12px] text-faint">{applications.length}건</span>
            <IconButton
              label="지원 현황 새로고침"
              onClick={() =>
                void queryClient.refetchQueries({ queryKey: ['applications', 'mine'] })
              }
            >
              <RefreshCw size={17} strokeWidth={1.75} aria-hidden />
            </IconButton>
          </div>
        </div>
        {applicationsLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : applicationsError ? (
          <p
            role="alert"
            className="rounded-field bg-subtle px-4 py-5 text-center text-[14px] text-error"
          >
            지원 현황을 불러오지 못했어요
          </p>
        ) : applications.length === 0 ? (
          <p className="rounded-field bg-subtle px-4 py-5 text-center text-[14px] text-muted">
            아직 지원한 공고가 없어요
          </p>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {applications.map((application) => (
              <li key={application.id} className="flex min-h-16 items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="clamp-1 text-[14px] font-semibold text-ink">
                    {application.job.storeName}
                  </p>
                  <p className="mt-1 text-[12px] text-faint">
                    {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(
                      new Date(application.createdAt),
                    )}
                  </p>
                </div>
                <Badge>{STATUS_LABEL[application.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        to="/settings"
        className="border-line-soft flex min-h-11 items-center justify-center gap-2 border-t py-4 text-[14px] font-semibold text-muted"
      >
        <Settings size={18} strokeWidth={1.75} aria-hidden />
        계정 및 설정
      </Link>
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
