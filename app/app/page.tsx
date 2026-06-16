'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Course, Track } from '@/lib/types';
import { AudioPlayer } from '@/components/player/AudioPlayer';

const ICONS = ['📖', '🧠', '💡', '🎯', '🌟', '📝', '🔥', '💎', '🎓', '🚀'];

export default function AppPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [currentTracks, setCurrentTracks] = useState<Track[]>([]);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(-1);
  const [loading, setLoading] = useState(true);

  const loadCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.status === 401) { router.push('/login'); return; }
      const data: Course[] = await res.json();
      setCourses(data);
      setFilteredCourses(data);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  useEffect(() => {
    if (!searchQuery) { setFilteredCourses(courses); return; }
    setFilteredCourses(
      courses.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, courses]);

  const openCourse = async (course: Course) => {
    setCurrentCourse(course);
    const res = await fetch(`/api/courses/${course.id}/tracks`);
    const tracks: Track[] = await res.json();
    setCurrentTracks(tracks);
    setCurrentTrackIdx(-1);
  };

  const goBack = () => {
    setCurrentCourse(null);
    setCurrentTracks([]);
    setCurrentTrackIdx(-1);
  };

  const playTrack = (idx: number) => setCurrentTrackIdx(idx);
  const playPrev = useCallback(() => setCurrentTrackIdx((i) => Math.max(0, i - 1)), []);
  const playNext = useCallback(() => {
    setCurrentTrackIdx((i) => (i < currentTracks.length - 1 ? i + 1 : i));
  }, [currentTracks.length]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const currentTrack = currentTrackIdx >= 0 ? currentTracks[currentTrackIdx] : null;
  const playerVisible = !!currentTrack;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-900 to-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 py-4">
          {currentCourse ? (
            <button
              onClick={goBack}
              className="text-slate-400 hover:text-white transition-colors p-1 -ml-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <span className="text-xl">🎧</span>
          )}
          <h1 className="flex-1 font-bold text-lg truncate">
            {currentCourse ? currentCourse.name : '音声コンテンツ'}
          </h1>
          {!currentCourse && (
            <div className="flex items-center gap-3">
              <a href="/admin" className="text-slate-400 hover:text-white transition-colors text-xl">⚙️</a>
              <button onClick={logout} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                ログアウト
              </button>
            </div>
          )}
        </div>

        {/* 検索バー（講座一覧のみ） */}
        {!currentCourse && (
          <div className="px-4 pb-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 講座を検索..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <main className={`flex-1 px-4 py-4 ${playerVisible ? 'pb-52' : 'pb-8'}`}>
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <span className="animate-spin text-2xl">⟳</span>
          </div>
        )}

        {/* 講座一覧 */}
        {!loading && !currentCourse && (
          <>
            {filteredCourses.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <div className="text-5xl mb-4">📭</div>
                <p>{searchQuery ? '該当する講座がありません' : '講座がまだありません'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium mb-4">
                  すべての講座（{filteredCourses.length}）
                </p>
                {filteredCourses.map((course, i) => (
                  <button
                    key={course.id}
                    onClick={() => openCourse(course)}
                    className="w-full bg-slate-800 hover:bg-slate-700 active:scale-[0.98] rounded-2xl p-4 flex items-center gap-4 transition-all text-left shadow-sm"
                  >
                    <div className="w-14 h-14 bg-slate-700 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {ICONS[i % ICONS.length]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{course.name}</p>
                      <p className="text-slate-400 text-sm mt-0.5">音声 {course.tracks.length} 本</p>
                    </div>
                    <svg className="w-5 h-5 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* トラック一覧 */}
        {!loading && currentCourse && (
          <>
            <p className="text-xs text-slate-500 font-medium mb-4">
              音声ファイル（{currentTracks.length} 本）
            </p>
            {currentTracks.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <p>音声ファイルがありません</p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl overflow-hidden">
                {currentTracks.map((track, i) => {
                  const isPlaying = i === currentTrackIdx;
                  return (
                    <button
                      key={track.id}
                      onClick={() => playTrack(i)}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 border-b border-slate-800 last:border-0 text-left transition-colors ${
                        isPlaying ? 'bg-blue-500/15' : 'hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isPlaying ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isPlaying ? '▶' : i + 1}
                      </div>
                      <p
                        className={`flex-1 text-sm truncate ${
                          isPlaying ? 'text-blue-300 font-semibold' : 'text-slate-200'
                        }`}
                      >
                        {track.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* オーディオプレーヤー */}
      <AudioPlayer
        track={currentTrack}
        onPrev={playPrev}
        onNext={playNext}
        hasPrev={currentTrackIdx > 0}
        hasNext={currentTrackIdx < currentTracks.length - 1}
      />
    </div>
  );
}
