/**
 * OWNER: 개발자 A (데이터/인증) — SPEC <signup_view> + PHASE2 F2·F3
 *
 * 가입은 3단계입니다. 단계 상태는 이 컴포넌트가 들고 있습니다 —
 * 라우터를 늘리지 않습니다(B 소유 파일이라 협의가 필요해집니다).
 *
 *   1. 이메일·비밀번호·닉네임 + 역할 선택
 *   2. 개인정보 활용 동의 (필수 1 + 선택 1)
 *   3. 자기소개서 — 구직자만. 사업자는 2단계에서 끝납니다
 *
 * Confirm email 이 꺼져 있어야 가입 즉시 세션이 생깁니다.
 * 켜져 있으면 가입은 되는데 로그인이 막혀 데모가 불가능합니다.
 */
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { AuthFailure } from '@/lib/auth-errors';
import { saveSeekerProfile } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import {
  AuthLayout,
  AuthLoading,
  Checkbox,
  ChoiceCard,
  Field,
  FormBanner,
  StepProgress,
  SubmitButton,
  TextareaField,
} from '@/features/auth/form-primitives';
import {
  validateEmail,
  validateNickname,
  validatePassword,
  validatePasswordConfirm,
} from '@/features/auth/validation';
import type { UserRole } from '@/types';
import { MAX_INTRO_LENGTH } from '@/lib/profile-limits';

type FieldErrors = {
  nickname?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
};

export default function SignupPage() {
  const { user, isLoading, signUp } = useAuth();

  const [step, setStep] = useState(1);

  // 1단계
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<UserRole>('seeker');

  // 2단계
  const [agreeRequired, setAgreeRequired] = useState(false);
  const [agreeOptional, setAgreeOptional] = useState(false);

  // 3단계
  const [intro, setIntro] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // 사업자는 자기소개서 단계가 없습니다.
  const totalSteps = role === 'employer' ? 2 : 3;

  if (isLoading) return <AuthLoading />;
  // 가입에 성공하면 자동 로그인 상태가 됩니다. 다만 제출이 끝나기 전에 세션이 먼저 생기면
  // 프로필 저장이 끝나기도 전에 화면이 날아가므로, 제출 중에는 이동을 미룹니다.
  if (user && !isPending) return <Navigate to="/" replace state={{ toast: '환영해요!' }} />;

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function goToStep2() {
    setBanner(null);
    const nextErrors: FieldErrors = {
      nickname: validateNickname(nickname),
      email: validateEmail(email),
      password: validatePassword(password),
      passwordConfirm: password !== passwordConfirm ? '비밀번호가 일치하지 않습니다' : undefined,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setStep(2);
  }

  async function submit() {
    setBanner(null);
    setIsPending(true);
    try {
      await signUp({ email, password, nickname, role });

      if (role === 'seeker') {
        // 닉네임을 프로필에도 복사합니다. auth 스키마는 API 로 노출되지 않아서,
        // 이게 없으면 사업자가 지원자 이름을 읽을 방법이 없습니다.
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (userId) {
          await saveSeekerProfile(userId, {
            nickname: nickname.trim(),
            intro: intro.trim() || null,
          });
        }
      }
      // 여기서 isPending 을 내리면 위의 <Navigate> 가 홈으로 보냅니다.
      setIsPending(false);
    } catch (error) {
      const failure = error instanceof AuthFailure ? error : null;
      if (failure && failure.field !== 'form') {
        setErrors((prev) => ({ ...prev, [failure.field]: failure.message }));
        // 이메일·비밀번호 문제면 고칠 수 있는 1단계로 돌려보냅니다.
        setStep(1);
      } else {
        setBanner(failure?.message ?? '가입에 실패했어요. 잠시 후 다시 시도해 주세요');
      }
      setIsPending(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (step === 1) {
      goToStep2();
      return;
    }
    if (step === 2) {
      if (!agreeRequired) return;
      if (role === 'seeker') {
        setStep(3);
        return;
      }
    }
    void submit();
  }

  return (
    <AuthLayout>
      <StepProgress current={step} total={totalSteps} />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {banner && <FormBanner message={banner} />}

        {step === 1 && (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-muted">어떤 목적으로 오셨나요?</p>
              <ChoiceCard
                selected={role === 'seeker'}
                onSelect={() => setRole('seeker')}
                title="일자리를 찾고 있어요"
                description="공고를 넘겨 보고 마음에 드는 곳에 지원합니다"
              />
              <ChoiceCard
                selected={role === 'employer'}
                onSelect={() => setRole('employer')}
                title="직원을 구하고 있어요"
                description="내 공고에 들어온 지원자를 보고 채용합니다"
              />
            </div>

            <Field
              label="닉네임"
              type="text"
              value={nickname}
              onChange={(value) => {
                setNickname(value);
                clearError('nickname');
              }}
              onBlur={() =>
                setErrors((prev) => ({ ...prev, nickname: validateNickname(nickname) }))
              }
              error={errors.nickname}
              autoComplete="nickname"
              placeholder="2~10자"
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
            />

            <Field
              label="비밀번호"
              type="password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                clearError('password');
                setErrors((prev) => ({
                  ...prev,
                  passwordConfirm: validatePasswordConfirm(value, passwordConfirm),
                }));
              }}
              onBlur={() =>
                setErrors((prev) => ({ ...prev, password: validatePassword(password) }))
              }
              error={errors.password}
              autoComplete="new-password"
              placeholder="6자 이상"
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
            />

            <div className="mt-2">
              <SubmitButton>다음</SubmitButton>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h2 className="text-[18px] font-bold text-ink">개인정보 활용 동의</h2>
              <p className="mt-1 text-[13px] text-muted">
                필수 항목에 동의해야 가입할 수 있습니다.
              </p>
            </div>

            <div className="rounded-field border border-line bg-surface px-4 py-2">
              <Checkbox
                required
                checked={agreeRequired}
                onChange={setAgreeRequired}
                label="개인정보 수집 및 이용 동의"
                description="닉네임·이메일과 프로필에 적은 내용을 지원한 공고의 사업자에게 보여주는 데 사용합니다."
              />
              <div className="h-px bg-line-soft" />
              <Checkbox
                checked={agreeOptional}
                onChange={setAgreeOptional}
                label="맞춤 공고 추천 수신 동의"
                description="관심 직종에 맞는 새 공고가 올라오면 알려드립니다. 동의하지 않아도 가입할 수 있습니다."
              />
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-[52px] flex-1 rounded-field bg-subtle text-[16px] font-semibold text-muted"
              >
                이전
              </button>
              <div className="flex-[2]">
                <SubmitButton isPending={isPending} disabled={!agreeRequired}>
                  {role === 'employer' ? '가입하고 시작하기' : '다음'}
                </SubmitButton>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h2 className="text-[18px] font-bold text-ink">자기소개서</h2>
              <p className="mt-1 text-[13px] text-muted">
                지원할 때 사업자에게 함께 전달됩니다. 나중에 내 정보에서 고칠 수 있어요.
              </p>
            </div>

            <TextareaField
              label="나를 소개하는 글"
              value={intro}
              onChange={setIntro}
              maxLength={MAX_INTRO_LENGTH}
              placeholder="어떤 일을 해봤는지, 언제 일할 수 있는지 적어주세요."
              hint="비워 두고 나중에 채워도 됩니다"
              disabled={isPending}
            />

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isPending}
                className="h-[52px] flex-1 rounded-field bg-subtle text-[16px] font-semibold text-muted disabled:opacity-60"
              >
                이전
              </button>
              <div className="flex-[2]">
                <SubmitButton isPending={isPending}>가입하고 시작하기</SubmitButton>
              </div>
            </div>
          </>
        )}
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
