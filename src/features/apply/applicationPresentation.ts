import type { ApplicationStatus } from '@/types';

export const MY_APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: '지원 완료',
  viewed: '구인자 열람',
  accepted: '채용 확정',
  rejected: '지원 종료',
};

export function applicationBadgeVariant(status: ApplicationStatus) {
  if (status === 'accepted') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'neutral' as const;
}

export function formatApplicationDate(value: string, withTime = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 정보 없음';
  return new Intl.DateTimeFormat(
    'ko-KR',
    withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' },
  ).format(date);
}
