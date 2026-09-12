/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * Supabase가 돌려주는 영어 메시지를 한국어로 옮기는 유일한 지점입니다.
 * CRITICAL: 원문("Invalid login credentials")을 화면에 그대로 찍지 않습니다.
 *
 * `field`는 메시지를 어디에 붙일지 알려줍니다.
 *   'email' | 'password' → 해당 입력 아래 인라인
 *   'form'               → 폼 상단 배너
 */

export type AuthErrorField = 'email' | 'password' | 'form';

export class AuthFailure extends Error {
  readonly field: AuthErrorField;

  constructor(message: string, field: AuthErrorField = 'form') {
    super(message);
    this.name = 'AuthFailure';
    this.field = field;
  }
}

/** 원문 조각(소문자) → 화면 문구. 위에서부터 먼저 맞는 것을 씁니다. */
const AUTH_ERROR_MESSAGES: Array<[match: string, message: string, field: AuthErrorField]> = [
  ['invalid login credentials', '이메일 또는 비밀번호가 올바르지 않습니다', 'form'],
  ['user already registered', '이미 가입된 이메일입니다', 'email'],
  ['already been registered', '이미 가입된 이메일입니다', 'email'],
  ['unable to validate email address', '이메일 형식이 올바르지 않습니다', 'email'],
  ['email address', '이메일 형식이 올바르지 않습니다', 'email'],
  ['password should be at least', '비밀번호는 6자 이상이어야 합니다', 'password'],
  ['weak password', '비밀번호가 너무 단순합니다. 6자 이상으로 만들어 주세요', 'password'],
  // Confirm email 이 켜져 있을 때만 나옵니다. 대시보드에서 꺼야 하는 신호입니다.
  ['email not confirmed', '이메일 인증이 필요한 계정입니다. 팀에 문의해 주세요', 'form'],
  ['for security purposes', '잠시 후 다시 시도해 주세요', 'form'],
  ['rate limit', '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요', 'form'],
  ['failed to fetch', '네트워크에 연결하지 못했어요. 연결을 확인해 주세요', 'form'],
];

const FALLBACK = '문제가 발생했어요. 잠시 후 다시 시도해 주세요';

/** 어떤 에러든 화면에 띄울 수 있는 AuthFailure 로 바꿉니다. */
export function toAuthFailure(raw: unknown): AuthFailure {
  const original = raw instanceof Error ? raw.message : String(raw ?? '');
  const haystack = original.toLowerCase();

  for (const [match, message, field] of AUTH_ERROR_MESSAGES) {
    if (haystack.includes(match)) {
      if (match === 'email not confirmed') {
        console.warn(
          '[auth] Confirm email 이 켜져 있습니다. Supabase > Authentication > Providers > Email 에서 끄세요.',
        );
      }
      return new AuthFailure(message, field);
    }
  }

  // 원문은 콘솔에만 남깁니다. 디버깅은 되어야 하고 화면은 한국어여야 합니다.
  console.error('[auth] 처리되지 않은 에러:', original);
  return new AuthFailure(FALLBACK, 'form');
}
