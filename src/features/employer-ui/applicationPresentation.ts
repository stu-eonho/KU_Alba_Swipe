import type { ApplicationStatus } from '@/types';

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: '읽지 않음',
  viewed: '읽음',
  accepted: '관심 보냄',
  rejected: '거절',
};

export function employerApplicationBadgeVariant(status: ApplicationStatus) {
  if (status === 'applied') return 'info' as const;
  if (status === 'accepted') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'neutral' as const;
}

export function employerApplicationBarClass(status: ApplicationStatus): string {
  if (status === 'applied') return 'bg-info';
  if (status === 'accepted') return 'bg-success';
  if (status === 'rejected') return 'bg-error';
  return 'bg-line';
}

export function formatApplicationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 정보 없음';
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
}
