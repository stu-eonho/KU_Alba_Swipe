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

/**
 * 휴대전화번호.
 *
 * 입력은 "01012345678" 과 "010-1234-5678" 을 모두 받고, 저장은 숫자 11자리로
 * 통일합니다. 형식이 섞이면 비교와 중복 판정이 전부 흔들립니다.
 * 대한민국 휴대전화만 지원합니다 — 해외 번호는 범위 밖입니다.
 */
export function normalizePhone(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

/** 010-1234-5678. 자리수가 안 맞으면 들어온 값을 그대로 돌려줍니다. */
export function formatPhone(value: string | null | undefined): string {
  const digits = normalizePhone(value ?? '');
  if (digits.length !== 11) return value ?? '';
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 입력 중에 하이픈을 붙여 줍니다. 다 치고 나서야 형태가 잡히면 오타를 못 잡습니다. */
export function formatPhoneInput(value: string): string {
  const digits = normalizePhone(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function validatePhone(value: string): string | undefined {
  const digits = normalizePhone(value);
  if (!digits) return '전화번호를 입력해 주세요';
  if (!/^010[0-9]{8}$/.test(digits)) return '010으로 시작하는 11자리 번호를 입력해 주세요';
  return undefined;
}
