/**
 * OWNER: 개발자 A (데이터/인증) — SPEC <settings_view>
 *
 * "스와이프 기록 초기화"가 이 화면의 존재 이유입니다.
 * 이게 없으면 리허설을 한 번 돌 때마다 새 계정을 만들어야 합니다.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, RotateCcw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useResetSwipes, useSwipeStats } from '@/hooks/useSwipeHistory';
import { ConfirmDialog } from '@/features/settings/ConfirmDialog';
import { Toast, useToast } from '@/features/settings/Toast';

const APP_VERSION = 'v0.1.0';

type OpenDialog = 'reset' | 'signOut' | null;

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { stats } = useSwipeStats();
  const { reset, isResetting } = useResetSwipes();
  const { toast, showToast } = useToast();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  // <RequireAuth> 가 막아 주지만, 이 화면 하나만 직접 열렸을 때도 터지지 않게 둡니다.
  if (!user) return null;

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

  return (
    <div className="tabbar-safe">
      <section className="m-4 rounded-tile bg-surface p-5">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-subtle text-[22px] font-bold text-muted"
          >
            {user.nickname.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="clamp-1 text-[18px] font-bold text-ink">{user.nickname}</p>
            <p className="clamp-1 text-[13px] text-faint">{user.email}</p>
          </div>
        </div>

        <div className="mt-5 flex border-t border-line-soft pt-4">
          <Stat label="찜한 공고" value={stats.liked} />
          <div className="w-px bg-line-soft" />
          <Stat label="본 공고" value={stats.seen} />
        </div>
      </section>

      <section className="m-4 overflow-hidden rounded-tile bg-surface">
        <MenuRow
          icon={<RotateCcw size={20} className="text-muted" />}
          label="스와이프 기록 초기화"
          onClick={() => setOpenDialog('reset')}
        />
        <div className="h-px bg-line-soft" />
        <MenuRow
          icon={<LogOut size={20} className="text-nope" />}
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

      <Toast toast={toast} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 text-center">
      <p className="tabular text-[20px] font-bold text-ink">{value}</p>
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
      {icon}
      <span className={`flex-1 text-[15px] ${tone === 'danger' ? 'text-nope' : 'text-ink'}`}>
        {label}
      </span>
      <ChevronRight size={18} className="text-faint" aria-hidden />
    </button>
  );
}
