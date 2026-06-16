'use client';
import { useState, useEffect } from 'react';
import { Course } from '@/lib/types';
import { SortableList } from '@/components/ui/SortableList';
import { useToast } from '@/components/ui/Toast';

interface Props {
  courses: Course[];
  onUpdate: () => void;
}

export function CoursesTab({ courses: initialCourses, onUpdate }: Props) {
  const { toast } = useToast();
  const [courses, setCourses] = useState(initialCourses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [orderChanged, setOrderChanged] = useState(false);

  // 親から courses が更新されたら同期
  useEffect(() => { setCourses(initialCourses); }, [initialCourses]);

  const handleReorder = (next: Course[]) => {
    setCourses(next);
    setOrderChanged(true);
  };

  const saveOrder = async () => {
    await fetch('/api/courses/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: courses.map((c) => c.id) }),
    });
    setOrderChanged(false);
    toast('順番を保存しました', 'success');
    onUpdate();
  };

  const addCourse = async () => {
    const name = prompt('新しい講座名を入力してください');
    if (!name?.trim()) return;
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) { toast('追加に失敗しました', 'error'); return; }
    onUpdate();
  };

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setEditValue(course.name);
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) { setEditingId(null); return; }
    await fetch(`/api/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editValue.trim() }),
    });
    setEditingId(null);
    onUpdate();
  };

  const deleteCourse = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？\n音声ファイルもすべて削除されます。`)) return;
    await fetch(`/api/courses/${id}`, { method: 'DELETE' });
    onUpdate();
  };

  return (
    <div className="p-4 space-y-4">
      <button
        onClick={addCourse}
        className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3.5 rounded-xl transition-colors"
      >
        ＋ 新しい講座を追加
      </button>

      {orderChanged && (
        <button
          onClick={saveOrder}
          className="w-full bg-blue-50 text-blue-500 border border-blue-200 hover:bg-blue-100 font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          ✓ この順番で保存する
        </button>
      )}

      {courses.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm bg-white rounded-xl">
          講座がまだありません
        </div>
      )}

      <SortableList
        items={courses}
        onReorder={handleReorder}
        renderItem={(course, dragHandleProps) => (
          <div className="bg-white rounded-xl px-4 py-3 mb-2 flex items-center gap-3 shadow-sm">
            <span
              {...dragHandleProps}
              className="text-slate-300 cursor-grab active:cursor-grabbing text-xl select-none touch-none"
            >
              ⠿
            </span>
            <div className="flex-1 min-w-0">
              {editingId === course.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => saveEdit(course.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(course.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="w-full border border-blue-400 rounded-lg px-2 py-1 text-sm outline-none"
                />
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-800 truncate">{course.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">音声 {course.tracks.length} 本</p>
                </>
              )}
            </div>
            <button
              onClick={() => startEdit(course)}
              className="text-blue-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              ✏️
            </button>
            <button
              onClick={() => deleteCourse(course.id, course.name)}
              className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
            >
              🗑
            </button>
          </div>
        )}
      />
    </div>
  );
}
