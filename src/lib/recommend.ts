/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 콘텐츠 기반 선호 벡터 (Rocchio 변형). 순수 함수만 있습니다.
 *
 * 왜 KNN 이 아닌가:
 *   공고가 25~60개뿐이라 k-NN 은 이웃이 밀집하지 않습니다. k=5 면 전체의 10%가
 *   "이웃"이라 사실상 무작위입니다. 사용자 기반 협업 필터링은 수백~수천 명이
 *   있어야 하는데 데모에는 서너 명입니다.
 *   무엇보다 **"왜 이 공고가 떴는지" 설명할 수 없습니다.** 여기서는 가중치에서
 *   상위 성분을 뽑아 "요즘 카페·오후·식사제공을 좋아하시네요"라고 보여줄 수 있습니다.
 *
 * 가중치는 희소 맵입니다. 46차원 배열을 컬럼으로 두면 특징을 추가할 때마다
 * 스키마를 바꿔야 하지만, 키-값이면 코드만 고치면 됩니다.
 */
import type { Job } from '@/types';

export type Weights = Record<string, number>;

/** 오른쪽으로 넘겼을 때 올리는 양 */
const ALPHA = 1.0;
/**
 * 왼쪽으로 넘겼을 때 내리는 양.
 * 오른쪽보다 약하게 둡니다 — 왼쪽은 "싫다"보다 "지금은 아니다"에 가깝습니다.
 */
const BETA = 0.4;
/** 매 갱신마다 전체를 살짝 줄여 최근 취향이 더 세게 반영되게 합니다 */
const DECAY = 0.98;
/** 감쇠로 0 에 수렴한 키를 버리는 기준. 두면 맵이 계속 커집니다 */
const PRUNE_BELOW = 0.01;

/** 초기 취향 선택에서 고른 항목에 넣는 가중치 */
export const INITIAL_WEIGHT = 2.0;

const WAGE_BANDS = [
  { key: 'wage:0', label: '1만1천원 미만', max: 11_000 },
  { key: 'wage:1', label: '1만1천~1만2천5백원', max: 12_500 },
  { key: 'wage:2', label: '1만2천5백~1만4천원', max: 14_000 },
  { key: 'wage:3', label: '1만4천원 이상', max: Infinity },
] as const;

/** 근무 시작 시각으로 시간대를 나눕니다. 카드에 보이는 것과 같은 어휘를 씁니다. */
const TIME_SLOTS = [
  { key: 'time:새벽', label: '새벽', from: 0, to: 6 * 60 },
  { key: 'time:오전', label: '오전', from: 6 * 60, to: 12 * 60 },
  { key: 'time:오후', label: '오후', from: 12 * 60, to: 18 * 60 },
  { key: 'time:저녁', label: '저녁', from: 18 * 60, to: 24 * 60 },
] as const;

function startMinuteOf(workHours: string): number | null {
  const match = /^\s*(\d{1,2}):(\d{2})/.exec(workHours);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function wageKey(hourlyWage: number): string {
  return (WAGE_BANDS.find((band) => hourlyWage < band.max) ?? WAGE_BANDS[3]).key;
}

function timeKey(workHours: string): string | null {
  const start = startMinuteOf(workHours);
  if (start === null) return null;
  const slot = TIME_SLOTS.find((entry) => start >= entry.from && start < entry.to);
  return slot?.key ?? null;
}

/**
 * 공고 하나의 특징. 전부 0 또는 1 입니다.
 *
 * 값이 없는 축은 키 자체를 넣지 않습니다 — 0 을 넣어도 코사인에 영향이 없고,
 * 맵만 커집니다.
 */
export function featuresOf(job: Job): Weights {
  const features: Weights = {};

  features[`cat:${job.category}`] = 1;
  features[wageKey(job.hourlyWage)] = 1;

  const time = timeKey(job.workHours);
  if (time) features[time] = 1;

  // 주말이 하루라도 끼면 "주말 포함"입니다. 주말 근무는 가능 여부가 갈리는 축이라
  // 요일 7개를 따로 두는 것보다 이 둘로 나누는 편이 신호가 뚜렷합니다.
  const hasWeekend = job.workDays.includes('토') || job.workDays.includes('일');
  features[hasWeekend ? 'days:주말포함' : 'days:주중'] = 1;

  for (const benefit of job.benefits) features[`ben:${benefit}`] = 1;
  if (job.region) features[`region:${job.region}`] = 1;

  return features;
}

/**
 * 스와이프 한 번을 가중치에 반영합니다.
 *
 * 원본을 바꾸지 않고 새 맵을 돌려줍니다 — 호출부가 낙관적 갱신에 쓰기 때문에
 * 제자리 수정하면 되돌릴 값이 남지 않습니다.
 */
export function updateWeights(weights: Weights, job: Job, direction: 'left' | 'right'): Weights {
  const features = featuresOf(job);
  const delta = direction === 'right' ? ALPHA : -BETA;
  const next: Weights = {};

  for (const [key, value] of Object.entries(weights)) {
    const decayed = value * DECAY;
    if (Math.abs(decayed) >= PRUNE_BELOW) next[key] = decayed;
  }

  for (const key of Object.keys(features)) {
    const updated = (next[key] ?? 0) + delta;
    if (Math.abs(updated) >= PRUNE_BELOW) next[key] = updated;
    else delete next[key];
  }

  return next;
}

/** 초기 취향 선택 결과를 가중치로. 이미 학습된 값이 있으면 덮어쓰지 않고 더합니다. */
export function withInitialPicks(weights: Weights, keys: string[]): Weights {
  const next = { ...weights };
  for (const key of keys) next[key] = (next[key] ?? 0) + INITIAL_WEIGHT;
  return next;
}

/**
 * 코사인 유사도. 가중치가 비어 있거나 공통 축이 없으면 0 입니다.
 *
 * 0 이면 정렬이 무의미하므로 호출부는 원래 순서를 유지해야 합니다.
 */
export function scoreJob(weights: Weights, job: Job): number {
  const features = featuresOf(job);

  let dot = 0;
  let weightNorm = 0;
  let featureNorm = 0;

  for (const value of Object.values(weights)) weightNorm += value * value;
  for (const value of Object.values(features)) featureNorm += value * value;
  if (weightNorm === 0 || featureNorm === 0) return 0;

  // 특징 쪽이 항상 더 작으므로 그쪽을 훑습니다.
  for (const [key, value] of Object.entries(features)) {
    const weight = weights[key];
    if (weight !== undefined) dot += weight * value;
  }

  return dot / (Math.sqrt(weightNorm) * Math.sqrt(featureNorm));
}

/** 점수 내림차순. 동점이면 원래 순서를 지킵니다(안정 정렬). */
export function sortByPreference<T extends Job>(weights: Weights, jobs: T[]): T[] {
  if (Object.keys(weights).length === 0) return jobs;

  return [...jobs]
    .map((job, index) => ({ job, index, score: scoreJob(weights, job) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.job);
}

/** 키를 사람이 읽는 말로. "cat:카페" → "카페" */
export function labelOf(key: string): string {
  const [kind, rest] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];

  if (kind === 'wage') return WAGE_BANDS.find((band) => band.key === key)?.label ?? rest;
  if (kind === 'days') return rest === '주말포함' ? '주말 근무' : '주중 근무';
  if (kind === 'region') return rest;
  // cat / time / ben 은 값이 곧 라벨입니다.
  return rest;
}

/**
 * 가중치 상위 n개의 라벨. 홈 상단 배너에 씁니다.
 *
 * 음수는 제외합니다 — "싫어하는 것"을 "좋아하시네요" 옆에 띄우면 말이 안 됩니다.
 */
export function topPreferences(weights: Weights, n = 3): string[] {
  return Object.entries(weights)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => labelOf(key));
}

/** 초기 취향 화면이 고를 수 있는 항목. B 가 칩으로 그립니다. */
export const PREFERENCE_TIME_SLOTS = TIME_SLOTS.map((slot) => ({
  key: slot.key,
  label: slot.label,
}));

export function categoryKey(category: string): string {
  return `cat:${category}`;
}
