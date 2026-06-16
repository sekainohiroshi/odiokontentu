'use client';
import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Course, UploadItem } from '@/lib/types';
import { UploadQueueItem } from './UploadQueueItem';
import { useToast } from '@/components/ui/Toast';

const CONCURRENCY = 3;
const ACCEPTED = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac'];

interface Props {
  courses: Course[];
  supabaseUrl: string;
  supabaseAnonKey: string;
  onUploadComplete: () => void;
}

export function UploadTab({ courses, supabaseUrl, supabaseAnonKey, onUploadComplete }: Props) {
  const { toast } = useToast();
  const [courseId, setCourseId] = useState('');
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const activeRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const doUpload = useCallback(
    async (item: UploadItem, targetCourseId: string): Promise<void> => {
      const file = item.file;
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const title = file.name.replace(/\.[^.]+$/, '');
      const path = `${targetCourseId}/${uuidv4()}.${ext}`;

      // XHR でアップロード（progress イベント対応）
      const publicUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const uploadUrl = `${supabaseUrl}/storage/v1/object/audio/${path}`;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            updateItem(item.id, { progress: Math.round((e.loaded / e.total) * 100) });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(`${supabaseUrl}/storage/v1/object/public/audio/${path}`);
          } else {
            try {
              const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
              reject(new Error(body.message || body.error || `アップロード失敗 (${xhr.status})`));
            } catch {
              reject(new Error(`アップロード失敗 (${xhr.status})`));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('ネットワークエラーが発生しました')));
        xhr.addEventListener('abort', () => reject(new Error('キャンセルされました')));

        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${supabaseAnonKey}`);
        xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.setRequestHeader('Cache-Control', '31536000');
        xhr.send(file);
      });

      // DB にメタデータ保存
      const res = await fetch(`/api/courses/${targetCourseId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, blobUrl: publicUrl }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `DB保存エラー (${res.status})`);
      }
    },
    [supabaseUrl, supabaseAnonKey, updateItem]
  );

  const drainQueue = useCallback(
    (currentQueue: UploadItem[], targetCourseId: string) => {
      const pending = currentQueue.filter((i) => i.status === 'pending');
      const toStart = Math.min(CONCURRENCY - activeRef.current, pending.length);
      if (toStart <= 0) return;

      for (let n = 0; n < toStart; n++) {
        const item = pending[n];
        activeRef.current++;
        updateItem(item.id, { status: 'uploading', progress: 0 });

        doUpload(item, targetCourseId)
          .then(() => {
            updateItem(item.id, { status: 'done', progress: 100 });
          })
          .catch((e: Error) => {
            updateItem(item.id, { status: 'error', error: e.message });
          })
          .finally(() => {
            activeRef.current--;
            setQueue((q) => {
              const stillActive = q.some(
                (i) => i.status === 'pending' || i.status === 'uploading'
              );
              if (!stillActive) {
                const doneCount = q.filter((i) => i.status === 'done').length;
                if (doneCount > 0) onUploadComplete();
              }
              drainQueue(q, targetCourseId);
              return q;
            });
          });
      }
    },
    [doUpload, updateItem, onUploadComplete]
  );

  const enqueue = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext))
      );
      if (fileArray.length === 0) return;

      const newItems: UploadItem[] = fileArray.map((file) => ({
        id: uuidv4(),
        file,
        status: 'pending',
        progress: 0,
        courseId,
      }));

      setQueue((prev) => {
        const next = [...prev, ...newItems];
        if (!courseId) {
          toast('先に講座を選択してください', 'info');
        } else {
          drainQueue(next, courseId);
        }
        return next;
      });
    },
    [courseId, drainQueue, toast]
  );

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    enqueue(e.dataTransfer.files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) enqueue(e.target.files);
    e.target.value = '';
  };

  const handleCourseChange = (newId: string) => {
    setCourseId(newId);
    if (newId) {
      setQueue((q) => {
        drainQueue(q, newId);
        return q;
      });
    }
  };

  const retryItem = (id: string) => {
    if (!courseId) { toast('先に講座を選択してください', 'info'); return; }
    updateItem(id, { status: 'pending', progress: 0, error: undefined });
    setQueue((q) => { drainQueue(q, courseId); return q; });
  };

  const clearDone = () => {
    setQueue((q) => q.filter((i) => i.status !== 'done' && i.status !== 'error'));
  };

  const doneCount = queue.filter((i) => i.status === 'done').length;

  return (
    <div className="p-4 space-y-4">
      {/* 講座選択 */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          アップロード先の講座
        </label>
        <select
          value={courseId}
          onChange={(e) => handleCourseChange(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm outline-none focus:border-blue-400 transition-colors appearance-none cursor-pointer"
        >
          <option value="">— 講座を選択してください —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ドロップゾーン */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 select-none ${
          isDragging
            ? 'border-blue-400 bg-blue-50 scale-[1.01]'
            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          multiple
          className="hidden"
          onChange={handleChange}
        />
        <div className={`text-5xl mb-3 transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
          📁
        </div>
        <p className="text-blue-500 font-bold text-base mb-1">ここにファイルをドロップ</p>
        <p className="text-slate-400 text-sm">または タップして選択</p>
        <p className="text-slate-300 text-xs mt-2">MP3 / M4A / WAV / AAC / OGG / FLAC</p>
      </div>

      {/* キュー */}
      {queue.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500">
              キュー（{doneCount} / {queue.length} 完了）
            </p>
            {(doneCount > 0 || queue.some((i) => i.status === 'error')) && (
              <button
                onClick={clearDone}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors"
              >
                完了を消去
              </button>
            )}
          </div>
          <div className="space-y-2">
            {queue.map((item) => (
              <UploadQueueItem key={item.id} item={item} onRetry={retryItem} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
