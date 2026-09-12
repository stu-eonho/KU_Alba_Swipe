/**
 * OWNER: 개발자 A (데이터/인증) — SPEC <signup_view>
 *
 * Confirm email 이 꺼져 있어야 가입 즉시 세션이 생깁니다.
 * 켜져 있으면 가입은 되는데 로그인이 막혀 데모가 불가능합니다.
 */
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { AuthFailure } from '@/lib/auth-errors';
import { AuthLayout, Field, FormBanner, SubmitButton } from '@/features/auth/form-primitives';
import {
  validateEmail,
  validateNickname,
  validatePassword,
  validatePasswordConfirm,
} from '@/features/auth/validation';

type FieldErrors = {
  nickname?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
};

export default function SignupPage() {
  const { user, isLoading, signUp } = useAuth();

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  if (isLoading) return null;
  // 가입에 성공하면 자동 로그인 상태가 되므로 이 분기가 그대로 홈으로 보냅니다.
  if (user) return <Navigate to="/" replace state={{ toast: '환영해요!' }} />;

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBanner(null);

    const nextErrors: FieldErrors = {
      nickname: validateNickname(nickname),
      email: validateEmail(email),
      password: validatePassword(password),
      passwordConfirm: password !== passwordConfirm ? '비밀번호가 일치하지 않습니다' : undefined,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setIsPending(true);
    try {
      await signUp({ email, password, nickname });
    } catch (error) {
      const failure = error instanceof AuthFailure ? error : new AuthFailure('가입에 실패했어요');
      if (failure.field === 'form') setBanner(failure.message);
      else setErrors((prev) => ({ ...prev, [failure.field]: failure.message }));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {banner && <FormBanner message={banner} />}

        <Field
          label="닉네임"
          type="text"
          value={nickname}
          onChange={(value) => {
            setNickname(value);
            clearError('nickname');
          }}
          onBlur={() => setErrors((prev) => ({ ...prev, nickname: validateNickname(nickname) }))}
          error={errors.nickname}
          autoComplete="nickname"
          placeholder="2~10자"
          disabled={isPending}
        />

        <Field
          label="이메일"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            clearError('email');
          }}
          onBlur={() => setErrors((prev) => ({ ...prev, email: validateEmail(email) }))}
          error={errors.email}
          autoComplete="username"
          placeholder="you@example.com"
          disabled={isPending}
        />

        <Field
          label="비밀번호"
          type="password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            clearError('password');
            // 비밀번호를 고치면 확인 필드 에러도 즉시 다시 계산합니다.
            setErrors((prev) => ({
              ...prev,
              passwordConfirm: validatePasswordConfirm(value, passwordConfirm),
            }));
          }}
          onBlur={() => setErrors((prev) => ({ ...prev, password: validatePassword(password) }))}
          error={errors.password}
          autoComplete="new-password"
          placeholder="6자 이상"
          disabled={isPending}
        />

        <Field
          label="비밀번호 확인"
          type="password"
          value={passwordConfirm}
          onChange={(value) => {
            setPasswordConfirm(value);
            // 이 필드만 blur 를 기다리지 않습니다. 불일치는 바로 알려주는 편이 빠릅니다.
            setErrors((prev) => ({
              ...prev,
              passwordConfirm: validatePasswordConfirm(password, value),
            }));
          }}
          error={errors.passwordConfirm}
          autoComplete="new-password"
          disabled={isPending}
        />

        <div className="mt-2">
          <SubmitButton isPending={isPending}>가입하고 시작하기</SubmitButton>
        </div>
      </form>

      <p className="mt-6 text-center text-[14px] text-muted">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-semibold text-brand">
          로그인
        </Link>
      </p>
    </AuthLayout>
  );
}
