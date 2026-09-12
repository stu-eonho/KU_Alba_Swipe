/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 내 공고 목록의 한 줄. 탭하면 그 자리에서 펼쳐져 바로 고칩니다 —
 * 별도 수정 화면으로 보내지 않는 이유는 라우트가 B 소유이기도 하고,
 * 공고 하나를 손보려고 화면을 옮겼다 돌아오는 왕복이 불필요하기 때문입니다.
 *
 * 근무 요일·시간은 토글과 셀렉트로만 받습니다. 자유 입력으로 두면 형식이 깨져
 * 그 공고만 시간 겹침 필터에서 조용히 빠집니다.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { JOB_CATEGORIES, type JobPatch } from '@/lib/api/jobs';
import { toHHMM } from '@/lib/availability';
import { Field, TextareaField } from '@/features/auth/form-primitives';
import {
  PERSONALITY_TRAITS,
  WEEKDAYS,
  type Job,
  type PersonalityTrait,
  type Weekday,
} from '@/types';
import { MIN_HOURLY_WAGE, minWageMessage } from '@/lib/wage';

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
const MAX_TRAITS = 5;

function formatClock(minutes: number): string {
  return minutes === 1440 ? '24:00' : toHHMM(minutes);
}

/** "13:00 ~ 18:00" → [780, 1080]. 형식이 깨져 있으면 기본값으로 엽니다. */
function parseHours(workHours: string): [number, number] {
  const match = /^(\d{1,2}):(\d{2}) ~ (\d{1,2}):(\d{2})$/.exec(workHours.trim());
  if (!match) return [9 * 60, 18 * 60];
  return [Number(match[1]) * 60 + Number(match[2]), Number(match[3]) * 60 + Number(match[4])];
}

function parseDays(workDays: string): Weekday[] {
  return workDays
    .split('·')
    .filter((d): d is Weekday => (WEEKDAYS as readonly string[]).includes(d));
}

type Props = {
  job: Job;
  onSave: (patch: JobPatch) => Promise<unknown>;
  isSaving: boolean;
};

export function JobEditRow({ job, onSave, isSaving }: Props) {
  const [open, setOpen] = useState(false);

  const [storeName, setStoreName] = useState(job.storeName);
  const [category, setCategory] = useState(job.category);
  const [hourlyWage, setHourlyWage] = useState(String(job.hourlyWage));
  const [summary, setSummary] = useState(job.summary);
  const [address, setAddress] = useState(job.address);
  const [days, setDays] = useState<Weekday[]>(() => parseDays(job.workDays));
  const [[startMin, endMin], setHours] = useState<[number, number]>(() =>
    parseHours(job.workHours),
  );
  const [benefits, setBenefits] = useState<string[]>(job.benefits);
  const [traits, setTraits] = useState<PersonalityTrait[]>(job.wantedTraits ?? []);
  const [description, setDescription] = useState(job.description);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function toggle<T>(list: T[], value: T, max?: number): T[] {
    if (list.includes(value)) return list.filter((item) => item !== value);
    if (max !== undefined && list.length >= max) return list;
    return [...list, value];
  }

  async function handleSave() {
    setError(null);
    const wage = Number(hourlyWage);

    if (storeName.trim().length < 2) return setError('가게 이름을 2자 이상 입력해 주세요');
    if (!Number.isFinite(wage) || wage < MIN_HOURLY_WAGE) return setError(minWageMessage());
    if (summary.trim().length < 5) return setError('한 줄 요약을 5자 이상 입력해 주세요');
    if (address.trim().length < 5) return setError('주소를 입력해 주세요');
    if (days.length === 0) return setError('근무 요일을 하나 이상 선택해 주세요');

    try {
      await onSave({
        storeName,
        category,
        hourlyWage: wage,
        summary,
        description: description.trim() || summary.trim(),
        address,
        // 요일 순서를 고정해 "월·수·금" 형태로 맞춥니다. 판정 함수가 이 형식을 읽습니다.
        workDays: [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b)).join('·'),
        workHours: `${formatClock(startMin)} ~ ${formatClock(endMin)}`,
        benefits,
        wantedTraits: traits,
      });
      setSavedAt(Date.now());
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(
        message.includes('형식') ? message : '저장하지 못했어요. 잠시 후 다시 시도해 주세요',
      );
    }
  }

  return (
    /*
     * 왼쪽 3px 바 + 위아래 여백. 행이 헤어라인만으로 나뉘면 스크롤할 때
     * 어디서 어디까지가 한 공고인지 읽히지 않습니다.
     */
    <li className="border-t border-line-soft py-1 pl-3 [border-left:3px_solid_var(--color-line-soft)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-subtle"
      >
        <span className="min-w-0 flex-1">
          <span className="clamp-1 block text-[15px] font-semibold text-ink">{job.storeName}</span>
          <span className="mt-0.5 block text-[13px] text-muted">
            {job.category} · <span className="tabular">{job.hourlyWage.toLocaleString()}</span>원
          </span>
          <span className="mt-0.5 block text-[12px] text-faint">
            {job.workDays} {job.workHours} · {job.region}
          </span>
        </span>
        {open ? (
          <ChevronUp size={18} className="mt-1 shrink-0 text-faint" aria-hidden />
        ) : (
          <ChevronDown size={18} className="mt-1 shrink-0 text-faint" aria-hidden />
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-3 bg-app px-4 pt-1 pb-4">
          {error && (
            <p role="alert" className="rounded-lg bg-nope-bg p-3 text-[13px] text-nope">
              {error}
            </p>
          )}

          <Field
            label="가게 이름"
            type="text"
            value={storeName}
            onChange={setStoreName}
            disabled={isSaving}
          />

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-muted">업종</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={isSaving}
              className="h-11 w-full rounded-field border border-line bg-surface px-3 text-[16px] text-ink outline-none focus:border-brand disabled:bg-subtle"
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
            onChange={(value) => setHourlyWage(value.replace(/[^\d]/g, ''))}
            disabled={isSaving}
          />

          <Field
            label="한 줄 요약"
            type="text"
            value={summary}
            onChange={setSummary}
            disabled={isSaving}
          />

          <Field
            label="주소"
            type="text"
            value={address}
            onChange={setAddress}
            disabled={isSaving}
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
                    onClick={() => setDays((prev) => toggle(prev, day))}
                    disabled={isSaving}
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
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-muted">근무 시간</p>
            <div className="flex items-center gap-2">
              <ClockSelect
                label="시작 시간"
                value={startMin}
                onChange={(v) => setHours(([, end]) => [v, end])}
                disabled={isSaving}
              />
              <span className="text-[14px] text-faint">~</span>
              <ClockSelect
                label="종료 시간"
                value={endMin}
                onChange={(v) => setHours(([start]) => [start, v])}
                disabled={isSaving}
              />
            </div>
          </div>

          <ChipRow
            label="복리후생"
            options={BENEFIT_OPTIONS}
            selected={benefits}
            onToggle={(item) => setBenefits((prev) => toggle(prev, item))}
            disabled={isSaving}
          />

          <ChipRow
            label={`이런 분을 찾아요 (최대 ${MAX_TRAITS})`}
            options={PERSONALITY_TRAITS as readonly string[]}
            selected={traits}
            onToggle={(item) =>
              setTraits((prev) => toggle(prev, item as PersonalityTrait, MAX_TRAITS))
            }
            disabled={isSaving}
            tone="brand"
          />

          <TextareaField
            label="상세 내용"
            value={description}
            onChange={setDescription}
            maxLength={1000}
            disabled={isSaving}
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="h-11 flex-1 rounded-field bg-brand text-[15px] font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? '저장 중…' : '저장'}
            </button>
            {savedAt && !isSaving && <span className="text-[13px] text-like-deep">저장했어요</span>}
          </div>
        </div>
      )}
    </li>
  );
}

function ChipRow({
  label,
  options,
  selected,
  onToggle,
  disabled,
  tone = 'neutral',
}: {
  label: string;
  options: readonly string[];
  selected: readonly string[];
  onToggle: (item: string) => void;
  disabled?: boolean;
  tone?: 'neutral' | 'brand';
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((item) => {
          const on = selected.includes(item);
          const onClass =
            tone === 'brand'
              ? 'border-brand bg-brand-soft text-brand'
              : 'border-like bg-like-bg text-like-deep';
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              disabled={disabled}
              aria-pressed={on}
              className={`h-9 rounded-full border px-3 text-[13px] font-medium disabled:opacity-40 ${
                on ? onClass : 'border-line bg-surface text-muted'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
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
