/**
 * OWNER: 개발자 A (데이터/인증) — PHASE4 A-5 (Tier 2)
 *
 * 사장님이 공고를 직접 씁니다. 폼 프리미티브와 검증이 A 쪽에 있어서 A가 가져갔습니다.
 *
 * 근무 요일·시간 형식이 중요합니다. 시간 겹침 판정이 이 문자열을 파싱하므로,
 * 자유 입력으로 두면 새로 쓴 공고만 필터에서 빠집니다.
 * 그래서 요일은 토글, 시간은 셀렉트로 받아 형식을 고정합니다.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { JOB_CATEGORIES } from '@/lib/api/jobs';
import { toHHMM } from '@/lib/availability';
import { useCreateJob } from '@/hooks/useEmployerJobs';
import { JobImageField } from '@/features/employer-ui';
import { Field, FormBanner, SubmitButton, TextareaField } from '@/features/auth/form-primitives';
import { PERSONALITY_TRAITS, WEEKDAYS, type PersonalityTrait, type Weekday } from '@/types';

const TIME_OPTIONS = Array.from({ length: 49 }, (_, index) => index * 30);
const BENEFIT_OPTIONS = [
  '식사제공',
  '음료제공',
  '4대보험',
  '주휴수당',
  '야간수당',
  '초보가능',
  '교육지원',
  '유니폼제공',
];

const MIN_WAGE = 10_320; // 2026년 최저임금
const MAX_SUMMARY = 60;
const MAX_DESCRIPTION = 1000;

function formatClock(minutes: number): string {
  return minutes === 1440 ? '24:00' : toHHMM(minutes);
}

type Errors = Partial<Record<'storeName' | 'hourlyWage' | 'summary' | 'address' | 'days', string>>;

export default function EmployerJobFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createJob, isCreating } = useCreateJob();

  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState<string>(JOB_CATEGORIES[0]);
  const [hourlyWage, setHourlyWage] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [days, setDays] = useState<Weekday[]>([]);
  const [startMin, setStartMin] = useState(9 * 60);
  const [endMin, setEndMin] = useState(18 * 60);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [wantedTraits, setWantedTraits] = useState<PersonalityTrait[]>([]);
  // 공고 사진(F6). 선택 항목이라 안 올려도 저장된다 — 화면은 업종 기본 사진으로 채운다.
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);

  // 사장님만 쓸 수 있는 화면입니다. 라우터 가드가 막지만 직접 열렸을 때도 터지지 않게 둡니다.
  if (!user || user.role !== 'employer') return null;

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function validate(): Errors {
    const wage = Number(hourlyWage);
    return {
      storeName: storeName.trim().length < 2 ? '가게 이름을 2자 이상 입력해 주세요' : undefined,
      hourlyWage: !Number.isFinite(wage)
        ? '시급을 숫자로 입력해 주세요'
        : wage < MIN_WAGE
          ? `2026년 최저임금(${MIN_WAGE.toLocaleString()}원) 이상이어야 합니다`
          : undefined,
      summary: summary.trim().length < 5 ? '한 줄 요약을 5자 이상 입력해 주세요' : undefined,
      address: address.trim().length < 5 ? '주소를 입력해 주세요' : undefined,
      days: days.length === 0 ? '근무 요일을 하나 이상 선택해 주세요' : undefined,
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBanner(null);

    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    try {
      await createJob({
        storeName,
        category,
        hourlyWage: Number(hourlyWage),
        summary,
        description: description.trim() || summary.trim(),
        address,
        // 요일 순서를 고정해 "월·수·금" 형태로 맞춥니다. 판정 함수가 이 형식을 읽습니다.
        workDays: [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b)).join('·'),
        workHours: `${formatClock(startMin)} ~ ${formatClock(endMin)}`,
        benefits,
        wantedTraits,
        imageUrl,
      });
      navigate('/employer/jobs', { replace: true });
    } catch (error) {
      // 형식 검증 실패는 고칠 수 있는 문제라 그대로 보여줍니다.
      // 그 밖의 실패는 원문 대신 한 문장으로. 어느 쪽이든 입력값은 그대로 둡니다.
      const message =
        error instanceof Error && error.message.includes('형식')
          ? error.message
          : '공고를 올리지 못했어요. 잠시 후 다시 시도해 주세요';
      setBanner(message);
    }
  }

  return (
    <div className="tabbar-safe mx-auto w-full max-w-[480px] p-4">
      <h1 className="mb-1 text-[18px] font-bold text-ink">공고 올리기</h1>
      <p className="mb-5 text-[13px] text-muted">
        올린 공고는 구직자의 가능 시간과 맞을 때 홈에 노출됩니다.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {banner && <FormBanner message={banner} />}

        <Field
          label="가게 이름"
          type="text"
          value={storeName}
          onChange={(value) => {
            setStoreName(value);
            setErrors((prev) => ({ ...prev, storeName: undefined }));
          }}
          error={errors.storeName}
          placeholder="메가커피 안암역점"
          disabled={isCreating}
        />

        <div>
          <label
            htmlFor="job-category"
            className="mb-1.5 block text-[13px] font-semibold text-muted"
          >
            업종
          </label>
          <select
            id="job-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={isCreating}
            className="h-[52px] w-full rounded-field border border-line bg-surface px-3 text-[16px] text-ink outline-none focus:border-brand disabled:bg-subtle"
          >
            {JOB_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <Field
          label="시급 (원)"
          type="text"
          value={hourlyWage}
          onChange={(value) => {
            // 숫자만 받습니다. 콤마나 "원"이 섞여 들어오면 Number() 가 NaN 이 됩니다.
            setHourlyWage(value.replace(/[^\d]/g, ''));
            setErrors((prev) => ({ ...prev, hourlyWage: undefined }));
          }}
          error={errors.hourlyWage}
          placeholder={String(MIN_WAGE)}
          disabled={isCreating}
        />

        <Field
          label="한 줄 요약"
          type="text"
          value={summary}
          onChange={(value) => {
            setSummary(value.slice(0, MAX_SUMMARY));
            setErrors((prev) => ({ ...prev, summary: undefined }));
          }}
          error={errors.summary}
          placeholder="음료 제조와 홀 정리를 맡아요"
          disabled={isCreating}
        />

        <Field
          label="주소"
          type="text"
          value={address}
          onChange={(value) => {
            setAddress(value);
            setErrors((prev) => ({ ...prev, address: undefined }));
          }}
          error={errors.address}
          placeholder="서울 성북구 안암로 145"
          disabled={isCreating}
        />

        <div>
          <p className="mb-2 text-[13px] font-semibold text-muted">근무 요일</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const selected = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setDays((prev) => toggle(prev, day));
                    setErrors((prev) => ({ ...prev, days: undefined }));
                  }}
                  disabled={isCreating}
                  aria-pressed={selected}
                  className={`size-11 rounded-full border text-[15px] font-semibold disabled:opacity-60 ${
                    selected
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-surface text-muted'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {errors.days && <p className="mt-1.5 text-[13px] text-nope">{errors.days}</p>}
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-muted">근무 시간</p>
          <div className="flex items-center gap-2">
            <ClockSelect
              label="시작 시간"
              value={startMin}
              onChange={setStartMin}
              disabled={isCreating}
            />
            <span className="text-[14px] text-faint">~</span>
            <ClockSelect
              label="종료 시간"
              value={endMin}
              onChange={setEndMin}
              disabled={isCreating}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-muted">복리후생</p>
          <div className="flex flex-wrap gap-2">
            {BENEFIT_OPTIONS.map((item) => {
              const selected = benefits.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setBenefits((prev) => toggle(prev, item))}
                  disabled={isCreating}
                  aria-pressed={selected}
                  className={`h-9 rounded-full border px-3 text-[13px] font-medium disabled:opacity-60 ${
                    selected
                      ? 'border-like bg-like-bg text-like-deep'
                      : 'border-line bg-surface text-muted'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[13px] font-semibold text-muted">이런 분을 찾아요</p>
          <p className="mb-2 text-[12px] text-faint">
            구직자 프로필의 성격 키워드와 같은 목록입니다. 최대 5개.
          </p>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map((trait) => {
              const selected = wantedTraits.includes(trait);
              const full = wantedTraits.length >= 5;
              return (
                <button
                  key={trait}
                  type="button"
                  onClick={() =>
                    setWantedTraits((prev) =>
                      prev.includes(trait)
                        ? prev.filter((item) => item !== trait)
                        : // 5개를 넘기면 DB CHECK 에 걸립니다. 화면에서 먼저 막습니다.
                          prev.length >= 5
                          ? prev
                          : [...prev, trait],
                    )
                  }
                  disabled={isCreating || (!selected && full)}
                  aria-pressed={selected}
                  className={`h-9 rounded-full border px-3 text-[13px] font-medium disabled:opacity-40 ${
                    selected
                      ? 'border-brand bg-brand-soft text-brand'
                      : 'border-line bg-surface text-muted'
                  }`}
                >
                  {trait}
                </button>
              );
            })}
          </div>
        </div>

        <JobImageField value={imageUrl} onChange={setImageUrl} />

        <TextareaField
          label="상세 내용"
          value={description}
          onChange={setDescription}
          maxLength={MAX_DESCRIPTION}
          placeholder="예: 음료 제조, 포스 계산, 마감 정리를 맡아요. 초보자는 첫 주에 레시피 교육을 하고, 평일 오후에는 2명이 함께 근무합니다."
          hint="비워 두면 한 줄 요약이 대신 들어갑니다"
          disabled={isCreating}
        />

        <div className="mt-2">
          <SubmitButton isPending={isCreating}>공고 올리기</SubmitButton>
        </div>
      </form>
    </div>
  );
}

function ClockSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      disabled={disabled}
      className="h-11 flex-1 rounded-field border border-line bg-surface px-2 text-[16px] text-ink outline-none focus:border-brand disabled:bg-subtle"
    >
      {TIME_OPTIONS.map((minutes) => (
        <option key={minutes} value={minutes}>
          {formatClock(minutes)}
        </option>
      ))}
    </select>
  );
}
