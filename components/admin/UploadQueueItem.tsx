'use client';
import { UploadItem } from '@/lib/types';

const STATUS_ICON: Record<UploadItem['status'], string> = {
  pending: '⏳',
  uploading: '⬆️',
  done: '✅',
  error: '❌',
};

const STATUS_COLOR: Record<UploadItem['status'], string> = {
  pending: 'bg-slate-200',
  uploading: 'bg-blue-500',
  done: 'bg-emerald-500',
  error: 'bg-red-400',
};

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  item: UploadItem;
  onRetry: (id: string) => void;
}

export function UploadQueueItem({ item, onRetry }: Props) {
  return (
    <div
      className={`bg-white rounded-xl p-3 shadow-sm border transition-opacity ${
        item.status === 'done' ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-lg leading-none w-6 text-center flex-shrink-0">
          {STATUS_ICON[item.status]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{item.file.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatBytes(item.file.size)}</p>
        </div>
        {item.status === 'error' && (
          <button
            onClick={() => onRetry(item.id)}
            className="flex-shrink-0 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            ↩ 再試行
          </button>
        )}
      </div>

      {/* プログレスバー */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${STATUS_COLOR[item.status]}`}
          style={{ width: `${item.status === 'error' ? 100 : item.progress}%` }}
        />
      </div>

      {/* ステータスメッセージ */}
      <p
        className={`text-xs mt-1.5 ${
          item.status === 'error'
            ? 'text-red-500'
            : item.status === 'done'
            ? 'text-emerald-600'
            : 'text-slate-400'
        }`}
      >
        {item.status === 'pending' && '待機中...'}
        {item.status === 'uploading' && `${Math.round(item.progress)}%`}
        {item.status === 'done' && '完了'}
        {item.status === 'error' && (item.error || 'エラーが発生しました')}
      </p>
    </div>
  );
}
