import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarClock, ChevronRight, ClipboardList, Heart, LogOut, PlayCircle, RotateCcw, UserRound } from 'lucide-react';
import { ConfirmDialog as UiConfirmDialog, useToast as useGlobalToast } from '@/components/ui';
import { resetTutorial } from '@/features/onboarding/tutorialStorage';
import { ConfirmDialog } from '@/features/settings/ConfirmDialog';
import { Toast, useToast } from '@/features/settings/Toast';
import { ProfileAvatar } from '@/features/profile';
import { useDeleteAccount } from '@/hooks/useDeleteAccount';
import { useSeekerProfile } from '@/hooks/useSeekerProfile';
import { useResetSwipes, useSwipeStats } from '@/hooks/useSwipeHistory';
import { useAuth } from '@/lib/auth-context';

const APP_VERSION = 'v0.1.0';
type OpenDialog = 'reset' | 'signOut' | 'deleteAccount' | null;

const DELETE_FALLBACK = '탈퇴하지 못했어요. 다시 시도해 주세요';

/** 훅이 던지는 값이 Error 가 아닐 수도 있어(PostgrestError) message 를 방어적으로 꺼낸다. */
function messageOf(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  // 업로드한 사진은 seeker_profiles.avatar_url 에 있다. user_metadata 에는 없다.
  const { profile } = useSeekerProfile();
  const { stats } = useSwipeStats();
  const { reset, isResetting } = useResetSwipes();
  const { deleteAccount, isDeleting } = useDeleteAccount();
  const { toast, showToast } = useToast();
  // 탈퇴하면 이 화면이 즉시 언마운트되므로(로그아웃 → user null → /login) 성공 토스트는
  // 화면에 매달린 로컬 토스트가 아니라 전역 ToastProvider 로 띄운다.
  const globalToast = useGlobalToast();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  if (!user) return null;
  const isSeeker = user.role === 'seeker';
  const userId = user.id;

  async function handleReset() {
    try {
      await reset();
      setOpenDialog(null);
      showToast('초기화했어요');
    } catch {
      setOpenDialog(null);
      showToast('초기화하지 못했어요. 다시 시도해 주세요', 'error');
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccount();
      setOpenDialog(null);
      globalToast.success('탈퇴가 완료됐어요');
      navigate('/login', { replace: true });
    } catch (error) {
      // 실패해도 화면은 그대로 두고 다이얼로그만 닫는다.
      setOpenDialog(null);
      globalToast.error(messageOf(error, DELETE_FALLBACK));
    }
  }

  /**
   * PHASE8 G1-a — 여기서 바로 열지 않는다.
   *
   * 인터랙티브 튜토리얼은 **덱 위에서만** 돈다(Tutorial.tsx 의 startedOnDeck).
   * /settings 에서 열면 앵커를 걸 덱이 없어 의도된 폴백인 옛날 슬라이드 4장이 떴다.
   * 그래서 기록을 지우고 **덱으로 데려가기만** 한다. 거기 마운트되는 <Tutorial /> 이
   * hasSeenTutorial === false 를 읽고 알아서 뜬다. 제어 컴포넌트를 쓸 이유가 없다.
   *
   * 이동만으로 정말 다시 뜨는가: 뜬다. router.tsx 가 <Tutorial /> 을 **덱 경로에서만**
   * 마운트하도록 바뀌었다(PHASE8 G1). /settings 에서는 언마운트 상태이므로 덱 도착이
   * 곧 새 마운트고, 그때 selfOpen = !hasSeenTutorial(...) 이 방금 지운 localStorage 를
   * 다시 읽어 true 가 된다. 탭 전환으로 덱이 이미 살아 있는 경우는 존재하지 않는다 —
   * 이 버튼은 /settings 에서만 눌리고, 그 화면에는 Tutorial 이 없다.
   */
  function replayTutorial() {
    resetTutorial(userId);
    navigate(isSeeker ? '/' : '/employer/applicants');
  }

  return (
    <div className="tabbar-safe">
      <section className="m-4 rounded-tile bg-surface p-5">
        <div className="flex items-center gap-4">
          {/*
            * 예전에는 nickname.charAt(0) 을 직접 그려서 사진을 올려도 이니셜만 나왔다.
            * ProfileAvatar 는 avatarUrl 이 있으면 이미지를, 없으면 이니셜을 그린다.
            */}
          <ProfileAvatar nickname={user.nickname} avatarUrl={profile?.avatarUrl} size={56} />
          <div className="min-w-0">
            <p className="clamp-1 text-[18px] font-semibold text-ink">{user.nickname}</p>
            <p className="clamp-1 text-[13px] text-faint">{user.email}</p>
            <p className="mt-1 text-[12px] text-muted">{isSeeker ? '구직자' : '구인자'}</p>
          </div>
        </div>

        {isSeeker && (
          <div className="mt-5 flex border-t border-line-soft pt-4">
            <Stat label="찜한 가게" value={stats.liked} />
            <div className="w-px bg-line-soft" />
            <Stat label="본 공고" value={stats.seen} />
          </div>
        )}
      </section>

      <section className="m-4 overflow-hidden rounded-tile bg-surface">
        {isSeeker ? (
          <>
            <MenuRow
              icon={<UserRound size={20} />}
              label="내 정보 수정"
              onClick={() => navigate('/settings/profile')}
            />
            <Divider />
            <MenuRow
              icon={<ClipboardList size={20} />}
              label="지원 현황"
              onClick={() => navigate('/settings/applications')}
            />
            <Divider />
            <MenuRow
              icon={<CalendarClock size={20} />}
              label="가능한 시간"
              onClick={() => navigate('/settings/availability')}
            />
            <Divider />
            <MenuRow
              icon={<Heart size={20} />}
              label="찜한 가게"
              onClick={() => navigate('/wishlist')}
            />
          </>
        ) : (
          <MenuRow
            icon={<Bell size={20} />}
            label="알림"
            onClick={() => navigate('/notifications')}
          />
        )}
        {/*
          * PHASE8 G1-b — 역할 공통 구역.
          * 이 두 행은 구직자 분기 안에만 있어서 구인자에게는 튜토리얼을 다시 볼 방법이
          * 아예 없었다. 구인자 쪽에 복사해 넣으면 다음에 또 한쪽만 빠진다. 분기 밖으로 뺀다.
          * 두 분기 모두 Divider 없이 끝나므로, 구분선은 여기서부터 이어 붙인다.
          */}
        <Divider />
        <MenuRow
          icon={<PlayCircle size={20} />}
          label="튜토리얼 다시 보기"
          onClick={replayTutorial}
        />
        <Divider />
        <MenuRow
          icon={<RotateCcw size={20} />}
          label="스와이프 기록 초기화"
          onClick={() => setOpenDialog('reset')}
        />
        <Divider />
        <MenuRow
          icon={<LogOut size={20} />}
          label="로그아웃"
          tone="danger"
          onClick={() => setOpenDialog('signOut')}
        />
      </section>

      {/* 실수로 누르기 어렵도록 메뉴 행이 아닌 작은 텍스트 버튼. 터치 타겟은 44px 유지. */}
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => setOpenDialog('deleteAccount')}
          className="min-h-11 px-4 text-[13px] text-faint underline underline-offset-2"
        >
          회원 탈퇴
        </button>
      </div>

      <p className="pb-4 text-center text-[12px] text-faint">AlbaSwipe {APP_VERSION}</p>

      {openDialog === 'reset' && (
        <ConfirmDialog
          title="스와이프 기록 초기화"
          description="모든 스와이프 기록이 지워지고 공고를 처음부터 다시 볼 수 있어요"
          confirmLabel="초기화"
          isPending={isResetting}
          onConfirm={handleReset}
          onCancel={() => setOpenDialog(null)}
        />
      )}

      {openDialog === 'signOut' && (
        <ConfirmDialog
          title="로그아웃"
          description="로그아웃하면 다시 로그인해야 해요"
          confirmLabel="로그아웃"
          tone="danger"
          onConfirm={handleSignOut}
          onCancel={() => setOpenDialog(null)}
        />
      )}

      {/* 취소가 기본 포커스 · Escape · 백드롭 탭까지 ConfirmDialog 가 처리한다. */}
      <UiConfirmDialog
        open={openDialog === 'deleteAccount'}
        title="정말 탈퇴하시겠어요?"
        description="찜한 공고, 지원 내역, 프로필이 모두 삭제됩니다. 되돌릴 수 없어요."
        confirmLabel="탈퇴하기"
        destructive
        loading={isDeleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => {
          if (!isDeleting) setOpenDialog(null);
        }}
      />

      {/*
        * <Tutorial /> 을 여기에 두지 않는다(PHASE8 G1-a). 설정 화면에는 덱이 없어
        * 스포트라이트를 걸 앵커가 없다. replayTutorial 이 덱으로 보내면 라우터가 그
        * 경로에서 <Tutorial /> 을 새로 마운트한다(router.tsx 의 isTutorialDeckPath).
        */}
      <Toast toast={toast} />
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-line-soft" />;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 text-center">
      <p className="tabular text-[20px] font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-[12px] text-faint">{label}</p>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  tone = 'default',
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: 'default' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[52px] w-full items-center gap-3 px-4 text-left active:bg-subtle"
    >
      <span className={tone === 'danger' ? 'text-error' : 'text-muted'}>{icon}</span>
      <span className={`flex-1 text-[15px] ${tone === 'danger' ? 'text-error' : 'text-ink'}`}>
        {label}
      </span>
      <ChevronRight size={18} className="text-faint" aria-hidden />
    </button>
  );
}
