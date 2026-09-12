/**
 * OWNER: 개발자 A (데이터/인증) — SPEC <login_view>
 *
 * 검증 시점: blur 와 제출. 입력 중에는 에러를 지웁니다 —
 * 타이핑하는 동안 빨간 글씨가 따라다니면 고치는 중에도 혼나는 느낌이 됩니다.
 */
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { AuthFailure } from '@/lib/auth-errors';
import {
  AuthLayout,
  AuthLoading,
  Field,
  FormBanner,
  SubmitButton,
} from '@/features/auth/form-primitives';
import { validateEmail, validatePassword } from '@/features/auth/validation';

type FieldErrors = { email?: string; password?: string };

export default function LoginPage() {
  const { user, isLoading, signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // 세션 복구가 끝나기 전에 폼을 그리면, 이미 로그인된 사용자가 로그인 화면을 한 번 보고 홈으로 튑니다.
  if (isLoading) return <AuthLoading />;
  if (user) return <Navigate to="/" replace />;

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBanner(null);

    const nextErrors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setIsPending(true);
    try {
      await signIn({ email, password });
      // 성공하면 onAuthStateChange 가 user 를 채우고 위의 <Navigate> 가 홈으로 보냅니다.
    } catch (error) {
      const failure = error instanceof AuthFailure ? error : new AuthFailure('로그인에 실패했어요');
      // 로그인 실패는 이유를 구분하지 않습니다. 어느 쪽이 틀렸는지 알려주지 않는 편이 안전합니다.
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
          }}
          onBlur={() => setErrors((prev) => ({ ...prev, password: validatePassword(password) }))}
          error={errors.password}
          autoComplete="current-password"
          disabled={isPending}
        />

        <div className="mt-2">
          <SubmitButton isPending={isPending}>로그인</SubmitButton>
        </div>
      </form>

      <p className="mt-6 text-center text-[14px] text-muted">
        아직 계정이 없으신가요?{' '}
        <Link to="/signup" className="font-semibold text-brand">
          회원가입
        </Link>
      </p>
    </AuthLayout>
  );
}
