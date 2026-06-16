'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Course } from '@/lib/types';
import { UploadTab } from '@/components/admin/UploadTab';
import { TracksTab } from '@/components/admin/TracksTab';
import { CoursesTab } from '@/components/admin/CoursesTab';

type Tab = 'upload' | 'tracks' | 'courses';

const TABS: { id: Tab; label: string }[] = [
  { id: 'upload', label: 'アップロード' },
  { id: 'tracks', label: '編集・並び替え' },
  { id: 'courses', label: '講座管理' },
];

interface Config { supabaseUrl: string; supabaseAnonKey: string }

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('upload');
  const [courses, setCourses] = useState<Course[]>([]);
  const [config, setConfig] = useState<Config | null>(null);

  const loadData = async () => {
    try {
      const [coursesRes, configRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/config'),
      ]);
      if (coursesRes.status === 401) { router.push('/login'); return; }
      const [coursesData, configData] = await Promise.all([
        coursesRes.json() as Promise<Course[]>,
        configRes.json() as Promise<Config>,
      ]);
      setCourses(coursesData);
      setConfig(configData);
    } catch {
      /* middleware が未認証をリダイレクトするので通常は到達しない */
    }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const tabContent = useMemo(() => {
    if (!config) return null;
    switch (tab) {
      case 'upload':
        return (
          <UploadTab
            courses={courses}
            supabaseUrl={config.supabaseUrl}
            supabaseAnonKey={config.supabaseAnonKey}
            onUploadComplete={loadData}
          />
        );
      case 'tracks':
        return <TracksTab courses={courses} onCourseUpdate={loadData} />;
      case 'courses':
        return <CoursesTab courses={courses} onUpdate={loadData} />;
    }
  }, [tab, courses, config]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-slate-900 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href="/app" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <h1 className="text-white font-bold text-lg">管理画面</h1>
        </div>
        <button
          onClick={logout}
          className="text-slate-500 hover:text-red-400 text-xs transition-colors"
        >
          ログアウト
        </button>
      </div>

      {/* タブバー */}
      <div className="bg-slate-900 border-t border-slate-800 flex sticky top-[60px] z-10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
              tab === t.id
                ? 'text-blue-400 border-blue-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1">
        {!config ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <span className="animate-spin text-2xl mr-3">⟳</span> 読み込み中...
          </div>
        ) : (
          tabContent
        )}
      </div>
    </div>
  );
}
