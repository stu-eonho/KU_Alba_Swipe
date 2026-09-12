import { useState } from 'react';
import { CheckCircle2, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Textarea, useToast } from '@/components/ui';
import { JobThumb, formatWage } from '@/features/wishlist';
import { useApply } from '@/hooks/useApply';
import type { Job, MyApplication } from '@/types';

const MAX_MESSAGE_LEN = 300;

export type ApplyFormProps = { job: Job };

export function ApplyForm({ job }: ApplyFormProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { existingApplication, isChecking, isCheckError, retryCheck, apply, isApplying } = useApply(
    job.id,
  );
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isApplying || submitted || existingApplication) return;

    try {
      await apply(job.id, message);
      setSubmitted(true);
      toast.success('지원이 완료됐어요!');
      await retryCheck();
    } catch {
      // 다른 탭에서 먼저 제출한 경우에도 서버 상태를 다시 읽어 완료 화면으로 수렴한다.
      const refreshed = await retryCheck();
      if (refreshed.data) {
        setSubmitted(true);
        toast.success('이미 지원을 완료한 가게예요');
        return;
      }
      toast.error('지원서를 보내지 못했어요. 다시 시도해 주세요');
    }
  };

  if (isChecking) return <ApplyCheckState label="지원 여부를 확인하는 중" />;

  if (isCheckError) {
    return (
      <div className="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center px-6 text-center">
        <WifiOff size={48} className="text-faint" aria-hidden />
        <h2 className="mt-4 text-[17px] font-semibold text-ink">지원 여부를 확인하지 못했어요</h2>
        <p className="mt-2 text-[14px] text-muted">
          중복 지원을 막기 위해 확인 후에만 제출할 수 있어요.
        </p>
        <Button variant="secondary" className="mt-5" onClick={() => void retryCheck()}>
          다시 확인
        </Button>
      </div>
    );
  }

  if (existingApplication || submitted) {
    return (
      <ApplyComplete
        application={existingApplication}
        onView={() =>
          navigate(
            existingApplication
              ? `/settings/applications/${existingApplication.id}`
              : '/settings/applications',
          )
        }
        onBack={() => navigate('/wishlist')}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-[calc(100dvh-56px)] flex-col">
      <section className="m-4 flex items-center gap-3 rounded-tile bg-surface p-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-field bg-subtle">
          <JobThumb job={job} iconSize={20} />
        </div>
        <div className="min-w-0">
          <p className="clamp-1 text-[15px] font-semibold leading-[1.35] text-ink">
            {job.storeName}
          </p>
          <p className="mt-0.5 text-[13px] leading-[1.4] text-muted">
            {job.category} · 시급 <span className="tabular">{formatWage(job.hourlyWage)}</span>
          </p>
        </div>
      </section>

      <div className="flex-1 px-4">
        <Textarea
          label="사장님께 한마디"
          value={message}
          onChange={(event) => setMessage(event.target.value.slice(0, MAX_MESSAGE_LEN))}
          maxLength={MAX_MESSAGE_LEN}
          placeholder="간단한 자기소개나 지원 동기를 적어주세요"
        />
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <p className="text-[12px] leading-[1.4] text-faint">닉네임과 함께 전달됩니다</p>
          <p className="tabular shrink-0 text-[12px] leading-[1.4] text-faint">
            <span className="sr-only">입력한 글자 수 </span>
            {message.length} / {MAX_MESSAGE_LEN}
          </p>
        </div>
      </div>

      <div
        className="sticky bottom-0 mt-6 border-t border-line bg-surface px-4 pt-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <Button type="submit" size="lg" fullWidth loading={isApplying}>
          지원서 보내기
        </Button>
      </div>
    </form>
  );
}

function ApplyCheckState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[calc(100dvh-56px)] items-center justify-center px-4" role="status">
      <p className="text-[14px] text-muted">{label}</p>
    </div>
  );
}

function ApplyComplete({
  application,
  onView,
  onBack,
}: {
  application: MyApplication | null;
  onView: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-brand-soft">
        <CheckCircle2 size={42} className="text-brand" strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="mt-5 text-[18px] font-semibold text-ink">지원 완료</h2>
      <p className="mt-2 text-[14px] leading-[1.6] text-muted">
        {application?.job.storeName ?? '이 가게'}에 이미 지원했어요.
        <br />
        보낸 내용과 진행 상태를 확인할 수 있어요.
      </p>
      <Button size="lg" fullWidth className="mt-7" onClick={onView}>
        지원 내용 보기
      </Button>
      <Button variant="ghost" size="lg" fullWidth className="mt-2" onClick={onBack}>
        찜한 가게로 돌아가기
      </Button>
    </div>
  );
}
