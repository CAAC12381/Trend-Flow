export function AsyncStateCard({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/15 bg-white/[0.05] p-6 text-center backdrop-blur-xl">
      <div className="text-lg font-semibold text-white/92">{title}</div>
      <p className="mt-2 text-sm text-white/62">{message}</p>
      {actionLabel && onAction && (
        <button
          className="mt-4 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#3b82f6] px-4 py-2 text-sm font-medium text-white"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
