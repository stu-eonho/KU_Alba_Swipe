/**
 * OWNER: 개발자 B (screen-composer)
 *
 * ALBASWIPE_SPEC.md <apply_view>
 *  공고 요약 카드(썸네일 64x64 + 가게명/직종·시급) → "사장님께 한마디" Textarea(최대 300자, 글자수 카운터)
 *  → 하단 sticky "지원서 보내기" Button primary lg
 *
 * CRITICAL(스펙 <submit>, Q2 = 버튼만): 저장하지 않는다.
 *  토스트 "지원이 완료됐어요!" + 800ms 뒤 /wishlist 로 이동만 한다.
 *  절대 에러를 내지 않는다 — 데모에서 버튼을 눌렀는데 에러가 뜨면 그 순간 끝난다.
 *  (저장은 하지 않는다. 토스트 후 반드시 이동한다.)
 *
 * 헤더를 만들지 않는다 — 라우터의 FullscreenLayout이 뒤로가기 + "지원하기" 탑바를 이미 렌더한다.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Textarea } from '@/components/ui';
import { JobThumb, formatWage } from '@/features/wishlist';
import { useToast } from '@/components/ui';
import type { Job } from '@/types';

/** 스펙 <apply_view><form>: 최대 300자 */
const MAX_MESSAGE_LEN = 300;
/** 스펙 <apply_view><submit>: 토스트 후 800ms 뒤 이동 */
const REDIRECT_DELAY_MS = 800;

export type ApplyFormProps = {
  job: Job;
};

export function ApplyForm({ job }: ApplyFormProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    // Q2 = "버튼만". 저장 훅이 없으므로 저장하지 않는다.
    // TODO(통합): Q2가 "실제 저장"으로 바뀌면 A의 훅으로 upsert 후 같은 토스트·이동을 유지한다.
    toast.success('지원이 완료됐어요!');
    timer.current = window.setTimeout(() => navigate('/wishlist'), REDIRECT_DELAY_MS);
  };

  return (
    // 탑바 56px을 뺀 높이를 최소로 잡아, 내용이 짧아도 제출 바가 화면 하단에 붙는다.
    // (뷰포트 단위는 iOS 주소창 대응으로 dvh를 쓴다)
    <form onSubmit={handleSubmit} className="flex min-h-[calc(100dvh-56px)] flex-col">
      {/* 공고 요약 — bg surface, radius 16px, margin 16px, padding 16px, 가로 배치 */}
      <section className="rounded-tile bg-surface m-4 flex items-center gap-3 p-4">
        <div className="rounded-field bg-subtle h-16 w-16 shrink-0 overflow-hidden">
          <JobThumb job={job} iconSize={20} />
        </div>
        <div className="min-w-0">
          <p className="clamp-1 text-ink text-[15px] leading-[1.35] font-bold">{job.storeName}</p>
          <p className="text-muted mt-0.5 text-[13px] leading-[1.4]">
            {job.category} · 시급 <span className="tabular">{formatWage(job.hourlyWage)}</span>
          </p>
        </div>
      </section>

      <div className="flex-1 px-4">
        <Textarea
          label="사장님께 한마디"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LEN))}
          maxLength={MAX_MESSAGE_LEN}
          placeholder="간단한 자기소개나 지원 동기를 적어주세요"
        />
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <p className="text-faint text-[12px] leading-[1.4]">닉네임과 함께 전달됩니다</p>
          {/* aria-live를 붙이지 않는다 — 타자마다 읽어주면 오히려 방해가 된다 */}
          <p className="tabular text-faint shrink-0 text-[12px] leading-[1.4]">
            <span className="sr-only">입력한 글자 수 </span>
            {message.length} / {MAX_MESSAGE_LEN}
          </p>
        </div>
      </div>

      {/* 하단 sticky 제출 바 */}
      <div
        className="border-line bg-surface sticky bottom-0 mt-6 border-t px-4 pt-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
          지원서 보내기
        </Button>
      </div>
    </form>
  );
}
