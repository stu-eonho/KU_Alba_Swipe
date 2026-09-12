import { useRef, useState } from 'react';
import { BookmarkPlus, CheckCircle2, WifiOff, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Textarea, useToast } from '@/components/ui';
import { JobThumb, formatWage } from '@/features/wishlist';
import { useApply } from '@/hooks/useApply';
import { useApplyTemplates } from '@/hooks/useApplyTemplates';
import type { Job, MyApplication } from '@/types';

const MAX_MESSAGE_LEN = 300;
const MIN_MESSAGE_LEN = 20;

/**
 * 공백을 뺀 실제 글자 수. "   ㅁ   " 로 20자를 채우는 꼼수를 막는다.
 *
 * \s 만 지우면 전각 스페이스(U+3000) 같은 유니코드 공백이 통과하므로 \p{White_Space} 를 쓴다.
 * 이 프로퍼티 이스케이프는 /u 플래그 없이는 문법 에러다 — g 와 함께 gu 로 둘 것.
 *
 * 자모만 반복하는 것("ㅁㅁㅁ…")도 성의가 없지만 검사하지 않는다.
 * 정상 입력을 잘못 막는 쪽이 더 나쁘고, 사용자가 말한 꼼수는 공백 제거만으로 막힌다.
 * 같은 이유로 이모지 20개도 통과시킨다.
 */
function meaningfulLength(text: string): number {
  return text.replace(/\p{White_Space}/gu, '').length;
}

export type ApplyFormProps = { job: Job };

export function ApplyForm({ job }: ApplyFormProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { existingApplication, isChecking, isCheckError, retryCheck, apply, isApplying } = useApply(
    job.id,
  );
  const [message, setMessage] = useState('');
  /*
   * 제출 결과. 'new' 는 방금 내가 보낸 것, 'existing' 은 이미 보내져 있던 것이다.
   * 두 경우의 완료 화면 문구가 다르므로 boolean 으로는 구분할 수 없다 —
   * 방금 보냈는데 "이미 지원했어요" 가 뜨던 버그가 여기서 나왔다.
   */
  const [submitted, setSubmitted] = useState<'new' | 'existing' | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isApplying || submitted || existingApplication) return;

    /*
     * 버튼 비활성만으로는 부족하다. 템플릿 칩 삽입·붙여넣기·자동완성으로 상태가 바뀌는 사이
     * 제출이 들어올 수 있고, form 은 Enter 로도 submit 된다. 제출 직전에 한 번 더 센다.
     */
    if (meaningfulLength(message) < MIN_MESSAGE_LEN) {
      toast.error(`공백을 뺀 ${MIN_MESSAGE_LEN}자 이상 적어주세요`);
      return;
    }

    try {
      await apply(job.id, message);
      setSubmitted('new');
      toast.success('지원이 완료됐어요!');
      await retryCheck();
    } catch {
      // 다른 탭에서 먼저 제출한 경우에도 서버 상태를 다시 읽어 완료 화면으로 수렴한다.
      const refreshed = await retryCheck();
      if (refreshed.data) {
        setSubmitted('existing');
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
    /*
     * 완료 화면에는 Textarea 가 없다. 템플릿 UI 는 ApplyMessageField 안에만 살아 있으므로
     * 이 분기에서는 템플릿 훅조차 돌지 않는다 — 테이블이 없어도 완료 화면은 멀쩡하다.
     */
    return (
      <ApplyComplete
        application={existingApplication}
        isNew={submitted === 'new'}
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

  const canSubmit = meaningfulLength(message) >= MIN_MESSAGE_LEN;

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
        <ApplyMessageField value={message} onChange={setMessage} />
      </div>

      <div
        className="sticky bottom-0 mt-6 border-t border-line bg-surface px-4 pt-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        {/*
          비활성 이유는 버튼이 아니라 입력부 글자 수 줄이 말해 준다("20자 이상 (현재 N자)").
          disabled 버튼에는 pointer-events 가 없어 툴팁도 토스트도 띄울 수 없기 때문이다.
        */}
        <Button type="submit" size="lg" fullWidth loading={isApplying} disabled={!canSubmit}>
          지원서 보내기
        </Button>
      </div>
    </form>
  );
}

/**
 * 지원 문구 입력부 — 템플릿 칩 행 · Textarea · 글자 수 · "템플릿으로 저장" 을 한 덩어리로 묶는다.
 *
 * 한 컴포넌트로 묶은 이유: 템플릿 훅을 한 번만 부르기 위해서다. 칩 행과 저장 버튼이
 * Textarea 위아래로 갈라져 있어 각자 훅을 부르면 isSaving 같은 뮤테이션 상태가
 * 두 벌이 되어 어긋난다.
 *
 * 템플릿은 부가 기능이다. 조회가 실패하면(예: apply_templates 테이블이 아직 없을 때)
 * 칩 행만 조용히 사라지고 지원 자체는 그대로 굴러가야 한다. 에러 화면을 띄우지 않는다.
 */
function ApplyMessageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const toast = useToast();
  const { templates, isLoading, isError, save, remove, isSaving } = useApplyTemplates();
  /*
   * 공유 Textarea 프리미티브는 ref 를 받지 않고, 그쪽은 손대지 않는다(다른 화면이 같이 쓴다).
   * 래퍼 div 를 통해 실제 <textarea> 노드를 집어 커서 위치를 읽는다.
   */
  const fieldRef = useRef<HTMLDivElement>(null);
  const nodeOf = () => fieldRef.current?.querySelector('textarea') ?? null;

  const insertTemplate = (body: string) => {
    const node = nodeOf();
    /*
     * 포커스가 없는 textarea 의 selectionStart 는 0 이다. 그대로 믿으면 칩을 눌렀을 때
     * 쓰던 글 맨 앞에 끼워진다 — 의도한 자리가 아니다. 커서를 못 잡았으면 글 끝에 붙인다.
     */
    const focused = node !== null && document.activeElement === node;
    const start = focused ? node.selectionStart : value.length;
    const end = focused ? node.selectionEnd : value.length;

    // 선택 구간은 어차피 대체되므로 그만큼이 남은 자리로 되돌아온다.
    const room = MAX_MESSAGE_LEN - (value.length - (end - start));
    if (room <= 0) {
      toast.error(`${MAX_MESSAGE_LEN}자를 다 채워서 더 넣을 수 없어요`);
      return;
    }

    // 넘치는 부분은 자른다. 넘긴 채로 두면 제출 검증에 걸린다.
    const piece = body.slice(0, room);
    onChange(value.slice(0, start) + piece + value.slice(end));
    if (piece.length < body.length) {
      toast.error(`${MAX_MESSAGE_LEN}자가 넘어 뒷부분은 잘라서 넣었어요`);
    }

    /*
     * 커서 이동은 상태가 반영된 다음이어야 한다. 지금 옮기면 리렌더가 덮어쓴다.
     * 삽입한 글 끝으로 보내고 포커스를 돌려줘야 이어서 쓸 수 있다.
     */
    const caret = start + piece.length;
    requestAnimationFrame(() => {
      const next = nodeOf();
      if (!next) return;
      next.focus();
      next.setSelectionRange(caret, caret);
    });
  };

  const handleRemove = (id: string) => {
    // 확인 다이얼로그 없이 바로 지운다 — 훅이 낙관적으로 목록에서 빼준다.
    remove(id);
    toast.success('템플릿을 지웠어요');
  };

  const handleSave = async () => {
    try {
      // 제목은 비워 보낸다 — 본문 앞 20자가 제목이 된다(lib/api/templates.ts).
      await save('', value);
      toast.success('템플릿으로 저장했어요');
    } catch {
      toast.error('템플릿을 저장하지 못했어요');
    }
  };

  // 로딩 중이거나 조회가 깨졌으면(테이블 없음 포함) 빈 줄이 남지 않게 행 자체를 그리지 않는다.
  const showChips = !isLoading && !isError && templates.length > 0;

  const meaningfulCount = meaningfulLength(value);
  /*
   * 저장 버튼의 disabled 조건과 같은 기준(trim)으로 판단한다.
   * 누를 수 없는 버튼 밑에 "이렇게 저장돼요" 가 떠 있으면 말이 안 된다.
   */
  const canSaveTemplate = value.trim().length > 0;
  return (
    <>
      <div ref={fieldRef}>
        <Textarea
          label="구인자님께 한마디"
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, MAX_MESSAGE_LEN))}
          maxLength={MAX_MESSAGE_LEN}
          placeholder="예: 카페에서 6개월 일해 음료 제조와 포스 사용에 익숙합니다. 평일 오후에 꾸준히 근무할 수 있어 지원합니다."
        />
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <p className="text-[12px] leading-[1.4] text-faint">닉네임과 함께 전달됩니다</p>
        {/*
          두 숫자가 다르다는 점이 핵심이다.
          상한(300)은 입력한 그대로의 value.length 로 세고, 하한(20)은 공백을 뺀 수로 센다.
          하나로 뭉뚱그리면 "300자 중 19자인데 왜 안 되지" 가 된다.
          미달일 때만 하한 표기로 바꾸고, 채우면 원래의 N / 300 으로 돌아간다.
          색은 faint↔muted 안에서만 움직인다 — 레드는 CTA 전용이다.
        */}
        {meaningfulCount < MIN_MESSAGE_LEN ? (
          <p className="shrink-0 text-[12px] leading-[1.4] text-muted">
            <span className="sr-only">공백을 뺀 </span>
            {MIN_MESSAGE_LEN}자 이상 (현재 <span className="tabular">{meaningfulCount}</span>자)
          </p>
        ) : (
          <p className="tabular shrink-0 text-[12px] leading-[1.4] text-faint">
            <span className="sr-only">입력한 글자 수 </span>
            {value.length} / {MAX_MESSAGE_LEN}
          </p>
        )}
      </div>

      {/*
        사용자가 가리킨 템플릿 칩을 입력창 위가 아니라 아래 박스에 모은다.
        저장 버튼도 같은 박스 안에 둬서 "작성 영역"과 "재사용 영역"이 분명히 나뉜다.
        가로 스크롤은 긴 템플릿이 여러 개여도 지원 화면 폭을 밀어내지 않게 한다.
      */}
      <div className="mt-4 rounded-field border border-line bg-app p-3">
        <p className="text-[13px] font-semibold leading-[1.4] text-ink">지원서 템플릿</p>
        {showChips ? (
          <div
            role="group"
            aria-label="저장한 지원서 템플릿"
            className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {templates.map((template) => (
              <span
                key={template.id}
                className="flex h-11 shrink-0 items-center rounded-full border border-line bg-surface"
              >
                <button
                  type="button"
                  onClick={() => insertTemplate(template.body)}
                  className="max-w-[160px] truncate py-2 pl-3.5 pr-1 text-[13px] font-medium leading-[1.3] text-ink transition-transform duration-100 ease-out active:scale-[0.97]"
                >
                  {template.title}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(template.id)}
                  aria-label={`${template.title} 템플릿 지우기`}
                  className="flex h-11 w-9 items-center justify-center rounded-r-full text-faint transition-transform duration-100 ease-out active:scale-[0.9]"
                >
                  <X size={15} aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[12px] leading-[1.5] text-faint">
            자주 쓰는 지원 문구를 저장해 두고 다시 사용할 수 있어요.
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSaveTemplate || isSaving}
          className="-ml-1 mt-1 inline-flex h-11 items-center gap-1.5 px-1 text-[13px] font-semibold leading-[1.4] text-muted transition-transform duration-100 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:text-faint"
        >
          <BookmarkPlus size={15} aria-hidden />
          현재 내용을 템플릿으로 저장
        </button>
      </div>
    </>
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
  isNew,
  onView,
  onBack,
}: {
  application: MyApplication | null;
  /** 방금 이 화면에서 보냈는지. 화면에 들어올 때부터 지원돼 있었으면 false. */
  isNew: boolean;
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
        {application?.job.storeName ?? '이 가게'}에 {isNew ? '지원했어요' : '이미 지원했어요'}.
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
