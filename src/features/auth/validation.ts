/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 로그인·회원가입이 공유하는 입력 검증. 문구는 전부 여기 있습니다.
 * 통과하면 undefined, 실패하면 화면에 띄울 한국어 문구를 돌려줍니다.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Supabase 기본값이 6자입니다. rough MVP 에서 더 빡빡하게 만들지 않습니다. */
export const MIN_PASSWORD_LENGTH = 6;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return '이메일을 입력해 주세요';
  if (!EMAIL_PATTERN.test(email)) return '올바른 이메일 주소를 입력해 주세요';
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return '비밀번호를 입력해 주세요';
  if (value.length < MIN_PASSWORD_LENGTH)
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다`;
  return undefined;
}

export function validateNickname(value: string): string | undefined {
  const nickname = value.trim();
  if (!nickname) return '닉네임을 입력해 주세요';
  if (nickname.length < 2 || nickname.length > 10) return '닉네임은 2~10자로 입력해 주세요';
  return undefined;
}

export function validatePasswordConfirm(password: string, confirm: string): string | undefined {
  if (!confirm) return undefined;
  if (password !== confirm) return '비밀번호가 일치하지 않습니다';
  return undefined;
}
