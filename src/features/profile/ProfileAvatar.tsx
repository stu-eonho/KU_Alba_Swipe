import clsx from 'clsx';

export function ProfileAvatar({
  nickname,
  avatarUrl,
  size = 72,
  className,
}: {
  nickname: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = nickname.trim().slice(0, 1) || '?';

  return (
    <div
      className={clsx(
        'bg-subtle text-ink border-line-soft flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-semibold',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(14, Math.round(size * 0.34)) }}
      aria-hidden
    >
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
    </div>
  );
}
