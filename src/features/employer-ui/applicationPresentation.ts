import type { ApplicationStatus } from '@/types';

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: '새 지원',
  viewed: '열람',
  accepted: '채용',
  rejected: '거절',
};

export function formatApplicationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 정보 없음';
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
}
