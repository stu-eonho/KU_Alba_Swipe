/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 공고의 근무 시간과 구직자의 가능 시간이 겹치는지 판정합니다.
 * 순수 함수만 있습니다 — 네트워크도 React 도 없어서 콘솔에서 바로 확인할 수 있습니다.
 *
 * 시드 포맷이 통일돼 있어 파싱이 쌉니다:
 *   work_days  : "월·수·금"      → split('·')
 *   work_hours : "13:00 ~ 18:00" → split('~') → 각각 "HH:MM"
 *
 * 그래도 포맷이 어긋난 공고가 하나 섞였을 때 덱 전체가 비면 안 되므로,
 * 파싱에 실패하면 "판정 불가"로 두고 그 공고는 **통과**시킵니다.
 * 잘못 숨기는 것보다 잘못 보여주는 쪽이 회복 가능합니다.
 */
import type { Availability, Job, Weekday } from '@/types';

const MINUTES_PER_DAY = 1440;

/** "13:00" → 780. 형식이 아니면 null. */
export function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** 780 → "13:00". 화면에 되돌려 보여줄 때 씁니다. */
export function toHHMM(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

const WEEKDAY_SET = new Set<string>(['월', '화', '수', '목', '금', '토', '일']);

/** "월·수·금" → ['월','수','금']. 가운뎃점 외에 쉼표·슬래시도 받아 둡니다. */
export function parseWorkDays(value: string): Weekday[] {
  return value
    .split(/[·,/\s]+/)
    .map((part) => part.trim())
    .filter((part): part is Weekday => WEEKDAY_SET.has(part));
}

/**
 * "13:00 ~ 18:00" → { start: 780, end: 1080 }
 *
 * 자정을 넘기는 구간("22:00 ~ 06:00")은 end 에 1440 을 더해 이어 붙입니다.
 * 그래야 "22시~30시" 처럼 한 줄로 비교할 수 있습니다.
 */
export function parseWorkHours(value: string): { start: number; end: number } | null {
  const parts = value.split('~');
  if (parts.length !== 2) return null;

  const start = toMinutes(parts[0]!);
  const end = toMinutes(parts[1]!);
  if (start === null || end === null) return null;

  return { start, end: end <= start ? end + MINUTES_PER_DAY : end };
}

/** 구직자의 가능 구간도 같은 규칙으로 폅니다. */
function normalizeAvailability(slot: Availability): { start: number; end: number } {
  const { startMin, endMin } = slot;
  return { start: startMin, end: endMin <= startMin ? endMin + MINUTES_PER_DAY : endMin };
}

/**
 * 공고의 근무 시간이 가능 시간 **안에 완전히 들어가는지**.
 *
 * 겹치기만 하면 되는 게 아닙니다 — 13~18시 공고에 15~18시만 가능한 사람은
 * 그 공고를 할 수 없습니다. 포함 관계여야 합니다.
 */
function covers(
  slot: { start: number; end: number },
  work: { start: number; end: number },
): boolean {
  if (slot.start <= work.start && work.end <= slot.end) return true;

  // 가능 시간이 자정을 넘겼다면 하루 뒤로 밀어 한 번 더 봅니다.
  // (가능 22:00~06:00, 근무 00:00~06:00 같은 경우)
  const shifted = { start: work.start + MINUTES_PER_DAY, end: work.end + MINUTES_PER_DAY };
  return slot.start <= shifted.start && shifted.end <= slot.end;
}

/**
 * 이 공고를 이 사람이 할 수 있는가.
 *
 * 공고의 **모든 근무 요일**에서 가능해야 통과합니다. 하나라도 안 맞으면 제외 —
 * 월·수·금 공고인데 수요일에 못 하면 그 알바는 못 하는 겁니다.
 *
 * 가능 시간을 아예 등록하지 않은 사용자는 전부 통과시킵니다.
 * 기존 계정과 건너뛴 사용자에게 빈 덱을 보여주지 않기 위해서입니다.
 */
export function isCompatible(job: Job, availability: Availability[]): boolean {
  if (availability.length === 0) return true;

  const days = parseWorkDays(job.workDays);
  const work = parseWorkHours(job.workHours);
  // 판정 불가 → 통과. 포맷이 어긋난 공고 하나 때문에 덱이 비면 안 됩니다.
  if (days.length === 0 || work === null) return true;

  const byDay = new Map(availability.map((slot) => [slot.day, normalizeAvailability(slot)]));

  return days.every((day) => {
    const slot = byDay.get(day);
    if (!slot) return false;
    return covers(slot, work);
  });
}

/** 자주 쓰는 시간대 프리셋. 가입 4단계의 빠른 입력 버튼입니다. */
export const AVAILABILITY_PRESETS = [
  { label: '오전', startMin: 9 * 60, endMin: 13 * 60 },
  { label: '오후', startMin: 13 * 60, endMin: 18 * 60 },
  { label: '저녁', startMin: 18 * 60, endMin: 22 * 60 },
  { label: '종일', startMin: 9 * 60, endMin: 22 * 60 },
] as const;
