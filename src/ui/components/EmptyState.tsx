import { Icon, type IconName } from './Icon';

/** Empty state yang menjelaskan langkah berikutnya, bukan sekadar menyatakan data kosong. */
export function EmptyState({
  icon,
  title,
  children,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="ap-fade flex flex-wrap items-center gap-4 rounded-2xl border-2 border-dashed border-slate-900 bg-white p-5" data-testid="empty-state">
      <span className="tag-lilac flex size-11 shrink-0 items-center justify-center rounded-full" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <div className="min-w-0 flex-1 basis-64">
        <div className="font-medium text-slate-900">{title}</div>
        <p className="text-sm text-slate-600">{children}</p>
      </div>
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel} <Icon name="arrow" size={16} />
        </button>
      )}
    </div>
  );
}
