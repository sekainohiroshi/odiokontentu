'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Course, Track } from '@/lib/types';
import { AudioPlayer } from '@/components/player/AudioPlayer';

const ICONS = ['📖', '🧠', '💡', '🎯', '🌟', '📝', '🔥', '💎', '🎓', '🚀'];

export type RepeatMode = 'none' | 'one' | 'all';
export type SortOrder = 'default' | 'name';

function sortByName<T extends { name?: string; title?: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const na = (a.name ?? a.title ?? '').toLowerCase();
    const nb = (b.name ?? b.title ?? '').toLowerCase();
    return na.localeCompare(nb, 'ja');
  });
}

export default function AppPage() {
  const router = useRouter();

  // データ
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // 講座フィルター・ソート
  const [searchQuery, setSearchQuery] = useState('');
  const [courseSort, setCourseSort] = useState<SortOrder>('default');

  // 現在の講座・トラック
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [currentTracks, setCurrentTracks] = useState<Track[]>([]);
  const originalTracksRef = useRef<Track[]>([]);
  const [trackSort, setTrackSort] = useState<SortOrder>('default');
  const [isShuffled, setIsShuffled] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(-1);

  // プレーヤー設定
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');

  // ===== 講座読み込み =====
  const loadCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.status === 401) { router.push('/login'); return; }
      const data: Course[] = await res.json();
      setCourses(data);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  // ===== 表示用講座リスト（検索 + ソート） =====
  const displayedCourses = (() => {
    let list = searchQuery
      ? courses.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : courses;
    if (courseSort === 'name') list = sortByName(list);
    return list;
  })();

  // ===== 講座を開く =====
  const openCourse = async (course: Course) => {
    setCurrentCourse(course);
    const res = await fetch(`/api/courses/${course.id}/tracks`);
    const tracks: Track[] = await res.json();
    originalTracksRef.current = tracks;
    setCurrentTracks(tracks);
    setTrackSort('default');
    setIsShuffled(false);
    setCurrentTrackIdx(-1);
  };

  const goBack = () => {
    setCurrentCourse(null);
    setCurrentTracks([]);
    setCurrentTrackIdx(-1);
    setTrackSort('default');
    setIsShuffled(false);
  };

  // ===== トラックソート =====
  const toggleTrackSort = () => {
    if (trackSort === 'default') {
      const sorted = sortByName(originalTracksRef.current) as Track[];
      setCurrentTracks(sorted);
      setTrackSort('name');
      setIsShuffled(false);
    } else {
      setCurrentTracks([...originalTracksRef.current]);
      setTrackSort('default');
    }
    setCurrentTrackIdx(-1);
  };

  // ===== シャッフル =====
  const toggleShuffle = () => {
    if (isShuffled) {
      const base = trackSort === 'name'
        ? sortByName(originalTracksRef.current) as Track[]
        : [...originalTracksRef.current];
      setCurrentTracks(base);
      setIsShuffled(false);
    } else {
      const arr = [...currentTracks];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setCurrentTracks(arr);
      setIsShuffled(true);
      setTrackSort('default');
    }
    setCurrentTrackIdx(-1);
  };

  // ===== 再生操作 =====
  const playTrack = (idx: number) => setCurrentTrackIdx(idx);

  const playPrev = useCallback(() => {
    setCurrentTrackIdx((i) => Math.max(0, i - 1));
  }, []);

  const playNext = useCallback(() => {
    if (repeatMode === 'one') return; // AudioPlayer が内部処理
    setCurrentTrackIdx((i) => {
      if (i >= currentTracks.length - 1) {
        return repeatMode === 'all' ? 0 : i;
      }
      return i + 1;
    });
  }, [currentTracks.length, repeatMode]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const currentTrack = currentTrackIdx >= 0 ? currentTracks[currentTrackIdx] : null;
  const playerVisible = !!currentTrack;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
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
            <span className="text-xl select-none">🎧</span>
          )}
          <h1 className="flex-1 font-bold text-lg truncate">
            {currentCourse ? currentCourse.name : '音声コンテンツ'}
          </h1>
          {!currentCourse && (
            <div className="flex items-center gap-2">
              <a href="/admin" className="text-slate-400 hover:text-white transition-colors p-1">⚙️</a>
              <button onClick={logout} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                ログアウト
              </button>
            </div>
          )}
        </div>

        {/* 講座一覧ツールバー */}
        {!currentCourse && (
          <div className="px-4 pb-3 flex gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 講座を検索..."
              className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={() => setCourseSort((s) => s === 'default' ? 'name' : 'default')}
              title={courseSort === 'name' ? 'デフォルト順に戻す' : '名前順に並び替え'}
              className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                courseSort === 'name'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {courseSort === 'name' ? 'A→Z ✓' : 'A→Z'}
            </button>
          </div>
        )}

        {/* トラック一覧ツールバー */}
        {currentCourse && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <p className="text-xs text-slate-500 flex-1">
              {currentTracks.length} 本
              {isShuffled && ' · シャッフル中'}
              {trackSort === 'name' && ' · 名前順'}
            </p>
            <button
              onClick={toggleTrackSort}
              title={trackSort === 'name' ? 'デフォルト順に戻す' : '名前順に並び替え'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                trackSort === 'name'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {trackSort === 'name' ? 'A→Z ✓' : 'A→Z'}
            </button>
            <button
              onClick={toggleShuffle}
              title={isShuffled ? 'シャッフルを解除' : 'シャッフル'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isShuffled
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              🔀
            </button>
          </div>
        )}
      </div>

      {/* メインコンテンツ */}
      <main className={`flex-1 px-4 py-4 ${playerVisible ? 'pb-64' : 'pb-8'}`}>
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <span className="animate-spin text-2xl">⟳</span>
          </div>
        )}

        {/* 講座一覧 */}
        {!loading && !currentCourse && (
          <>
            {displayedCourses.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <div className="text-5xl mb-4">📭</div>
                <p>{searchQuery ? '該当する講座がありません' : '講座がまだありません'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedCourses.map((course, i) => (
                  <button
                    key={course.id}
                    onClick={() => openCourse(course)}
                    className="w-full bg-slate-800 hover:bg-slate-700 active:scale-[0.98] rounded-2xl p-4 flex items-center gap-4 transition-all text-left"
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
            {currentTracks.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <p>音声ファイルがありません</p>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-2xl overflow-hidden">
                {currentTracks.map((track, i) => {
                  const isActive = i === currentTrackIdx;
                  return (
                    <button
                      key={track.id}
                      onClick={() => playTrack(i)}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 border-b border-slate-800 last:border-0 text-left transition-colors ${
                        isActive ? 'bg-blue-500/15' : 'hover:bg-slate-800'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isActive ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {isActive ? '▶' : i + 1}
                      </div>
                      <p className={`flex-1 text-sm truncate ${
                        isActive ? 'text-blue-300 font-semibold' : 'text-slate-200'
                      }`}>
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
        hasNext={repeatMode === 'all' ? currentTracks.length > 1 : currentTrackIdx < currentTracks.length - 1}
        repeatMode={repeatMode}
        onRepeatChange={setRepeatMode}
        isShuffled={isShuffled}
        onShuffleToggle={toggleShuffle}
      />
    </div>
  );
}
