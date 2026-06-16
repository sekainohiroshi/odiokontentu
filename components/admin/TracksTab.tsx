'use client';
import { useState, useEffect } from 'react';
import { Course, Track } from '@/lib/types';
import { SortableList } from '@/components/ui/SortableList';
import { useToast } from '@/components/ui/Toast';

interface Props {
  courses: Course[];
  onCourseUpdate: () => void;
}

export function TracksTab({ courses, onCourseUpdate }: Props) {
  const { toast } = useToast();
  const [courseId, setCourseId] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);

  const loadTracks = async (id: string) => {
    if (!id) { setTracks([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${id}/tracks`);
      const data = await res.json() as Track[];
      setTracks(data);
      setOrderChanged(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTracks(courseId); }, [courseId]);

  const handleReorder = (newTracks: Track[]) => {
    setTracks(newTracks);
    setOrderChanged(true);
  };

  const saveOrder = async () => {
    await fetch(`/api/courses/${courseId}/tracks/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: tracks.map((t) => t.id) }),
    });
    setOrderChanged(false);
    toast('順番を保存しました', 'success');
  };

  const startEdit = (track: Track) => {
    setEditingId(track.id);
    setEditValue(track.title);
  };

  const saveEdit = async (trackId: string) => {
    if (!editValue.trim()) { setEditingId(null); return; }
    await fetch(`/api/courses/${courseId}/tracks/${trackId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editValue.trim() }),
    });
    setEditingId(null);
    loadTracks(courseId);
  };

  const deleteTrack = async (trackId: string) => {
    if (!confirm('この音声ファイルを削除しますか？')) return;
    await fetch(`/api/courses/${courseId}/tracks/${trackId}`, { method: 'DELETE' });
    loadTracks(courseId);
    onCourseUpdate();
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">講座を選択</label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm outline-none focus:border-blue-400 transition-colors appearance-none cursor-pointer"
        >
          <option value="">— 講座を選択してください —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {orderChanged && (
        <button
          onClick={saveOrder}
          className="w-full bg-blue-50 text-blue-500 border border-blue-200 hover:bg-blue-100 font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          ✓ この順番で保存する
        </button>
      )}

      {loading && (
        <div className="text-center py-8 text-slate-400 text-sm">読み込み中...</div>
      )}

      {!loading && courseId && tracks.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm bg-white rounded-xl">
          音声ファイルがまだありません
        </div>
      )}

      {!loading && tracks.length > 0 && (
        <SortableList
          items={tracks}
          onReorder={handleReorder}
          renderItem={(track, dragHandleProps) => (
            <div className="bg-white rounded-xl px-4 py-3 mb-2 flex items-center gap-3 shadow-sm">
              <span
                {...dragHandleProps}
                className="text-slate-300 cursor-grab active:cursor-grabbing text-xl select-none touch-none"
              >
                ⠿
              </span>
              <div className="flex-1 min-w-0">
                {editingId === track.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(track.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(track.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full border border-blue-400 rounded-lg px-2 py-1 text-sm outline-none"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800 truncate">{track.title}</p>
                )}
              </div>
              <button
                onClick={() => startEdit(track)}
                className="text-blue-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
              >
                ✏️
              </button>
              <button
                onClick={() => deleteTrack(track.id)}
                className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
              >
                🗑
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}
