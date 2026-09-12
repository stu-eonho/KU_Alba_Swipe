import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  ClipboardList,
  Heart,
  LogOut,
  PlayCircle,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import { Tutorial } from '@/features/onboarding';
import { resetTutorial } from '@/features/onboarding/tutorialStorage';
import { ConfirmDialog } from '@/features/settings/ConfirmDialog';
import { Toast, useToast } from '@/features/settings/Toast';
import { useResetSwipes, useSwipeStats } from '@/hooks/useSwipeHistory';
import { useAuth } from '@/lib/auth-context';

const APP_VERSION = 'v0.1.0';
type OpenDialog = 'reset' | 'signOut' | null;

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { stats } = useSwipeStats();
  const { reset, isResetting } = useResetSwipes();
  const { toast, showToast } = useToast();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [showTutorial, setShowTutorial] = useState(false);

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

  function replayTutorial() {
    resetTutorial(userId);
    setShowTutorial(true);
  }

  return (
    <div className="tabbar-safe">
      <section className="m-4 rounded-tile bg-surface p-5">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-subtle text-[22px] font-semibold text-muted"
          >
            {user.nickname.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="clamp-1 text-[18px] font-semibold text-ink">{user.nickname}</p>
            <p className="clamp-1 text-[13px] text-faint">{user.email}</p>
            <p className="mt-1 text-[12px] text-muted">{isSeeker ? '구직자' : '사업자'}</p>
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
              icon={<Heart size={20} />}
              label="찜한 가게"
              onClick={() => navigate('/wishlist')}
            />
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
          </>
        ) : (
          <MenuRow
            icon={<Bell size={20} />}
            label="알림"
            onClick={() => navigate('/notifications')}
          />
        )}
        <Divider />
        <MenuRow
          icon={<LogOut size={20} />}
          label="로그아웃"
          tone="danger"
          onClick={() => setOpenDialog('signOut')}
        />
      </section>

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

      <Tutorial userId={user.id} open={showTutorial} onClose={() => setShowTutorial(false)} />
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
