/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 화면이 분기에 쓸 수 있는 업무 에러입니다.
 * Supabase 의 원문 메시지나 PostgreSQL 코드를 화면까지 올려보내지 않습니다.
 */

/** 이미 지원한 공고에 다시 지원했을 때. 실패가 아니라 정상 분기입니다. */
export class AlreadyAppliedError extends Error {
  readonly code = 'ALREADY_APPLIED' as const;

  constructor() {
    super('이미 지원을 완료한 가게예요');
    this.name = 'AlreadyAppliedError';
  }
}

/** PostgreSQL unique_violation. 중복 지원 판정의 최종 근거입니다. */
const UNIQUE_VIOLATION = '23505';

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}
