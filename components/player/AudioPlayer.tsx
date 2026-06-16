'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Track } from '@/lib/types';
import type { RepeatMode } from '@/app/app/page';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

interface Props {
  track: Track | null;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  repeatMode: RepeatMode;
  onRepeatChange: (mode: RepeatMode) => void;
  isShuffled: boolean;
  onShuffleToggle: () => void;
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

const REPEAT_NEXT: Record<RepeatMode, RepeatMode> = { none: 'all', all: 'one', one: 'none' };
const REPEAT_LABEL: Record<RepeatMode, string> = { none: '🔁', all: '🔁', one: '🔂' };

export function AudioPlayer({
  track, onPrev, onNext, hasPrev, hasNext,
  repeatMode, onRepeatChange, isShuffled, onShuffleToggle,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  // トラック変更 → 自動再生
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.blobUrl) return;
    audio.src = track.blobUrl;
    audio.playbackRate = speed;
    audio.volume = isMuted ? 0 : volume;
    setError('');
    setCurrentTime(0);
    setDuration(0);
    audio.play().catch((e: Error) => setError(e.message));
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => onNext(), [onNext]);

  // オーディオイベント
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const log = (ev: string, extra = '') =>
      console.log(`[Player] ${ev} | ct=${audio.currentTime.toFixed(2)} dur=${audio.duration} ready=${audio.readyState} paused=${audio.paused}${extra ? ' | ' + extra : ''}`);

    const onTime = () => {
      setCurrentTime(audio.currentTime);
      // duration が遅れて確定するケースに対応
      if (audio.duration && !isNaN(audio.duration)) setDuration(audio.duration);
    };
    const onMeta = () => {
      log('loadedmetadata');
      setDuration(isNaN(audio.duration) ? 0 : audio.duration);
    };
    const onDurationChange = () => {
      log('durationchange');
      if (audio.duration && !isNaN(audio.duration)) setDuration(audio.duration);
    };
    const onCanPlay = () => log('canplay');
    const onEnded = () => {
      log('ended');
      if (repeatModeRef.current === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        setIsPlaying(false);
        handleNext();
      }
    };
    const onPlay  = () => { log('play');  setIsPlaying(true); };
    const onPause = () => { log('pause'); setIsPlaying(false); };
    const onError = () => {
      const code = audio.error?.code;
      const msg  = audio.error?.message ?? '';
      log('error', `code=${code} msg=${msg}`);
      setError(`再生に失敗しました (${code})`);
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, [handleNext]);

  // Media Session API
  useEffect(() => {
    if (!track || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title });
    navigator.mediaSession.setActionHandler('play',           () => audioRef.current?.play());
    navigator.mediaSession.setActionHandler('pause',          () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler('previoustrack',  onPrev);
    navigator.mediaSession.setActionHandler('nexttrack',      onNext);
    navigator.mediaSession.setActionHandler('seekbackward',   () => skip(-15));
    navigator.mediaSession.setActionHandler('seekforward',    () => skip(15));
  }, [track, onPrev, onNext]); // eslint-disable-line react-hooks/exhaustive-deps

  // キーボードショートカット
  useEffect(() => {
    if (!track) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); skip(-15); }
      if (e.key === 'ArrowRight') { e.preventDefault(); skip(15); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); changeVolume(Math.min(1, volume + 0.1)); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); changeVolume(Math.max(0, volume - 0.1)); }
      if (e.key === 'm' || e.key === 'M') toggleMute();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [track, volume]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    isPlaying ? audio.pause() : audio.play();
  };

  const skip = (sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration || 0, audio.currentTime + sec));
  };

  const setPlaybackRate = (rate: number) => {
    setSpeed(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    setIsMuted(false);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const toggleMute = () => {
    setIsMuted((m) => {
      const next = !m;
      if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
      return next;
    });
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const effectiveVolume = isMuted ? 0 : volume;
  const volumeIcon = effectiveVolume === 0 ? '🔇' : effectiveVolume < 0.4 ? '🔈' : effectiveVolume < 0.8 ? '🔉' : '🔊';

  return (
    <>
      {/* audio は常に DOM に存在させて ref・event listeners を維持 */}
      <audio ref={audioRef} className="hidden" />

      {track && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/97 backdrop-blur-md border-t border-slate-800 px-4 pt-3 safe-area-bottom z-20">

          {/* タイトル */}
          <p className="text-white text-sm font-semibold mb-2 truncate leading-tight">
            {error ? `⚠️ ${error}` : track.title}
          </p>

          {/* シークバー */}
          <div
            className="relative h-1.5 bg-slate-700 rounded-full mb-1 cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* メインコントロール */}
          <div className="flex items-center justify-between mb-2.5 px-1">
            <button
              onClick={onShuffleToggle}
              title="シャッフル"
              className={`p-2 rounded-lg transition-colors text-lg ${
                isShuffled ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              🔀
            </button>

            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="text-slate-400 disabled:opacity-25 p-2 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
              </svg>
            </button>

            <button onClick={() => skip(-15)} className="text-slate-400 hover:text-white transition-colors relative">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold mt-0.5">15</span>
            </button>

            <button
              onClick={togglePlay}
              className="w-14 h-14 bg-blue-500 hover:bg-blue-400 active:scale-95 rounded-full text-white flex items-center justify-center transition-all shadow-lg shadow-blue-500/30"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            <button onClick={() => skip(15)} className="text-slate-400 hover:text-white transition-colors relative">
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold mt-0.5">15</span>
            </button>

            <button
              onClick={onNext}
              disabled={!hasNext}
              className="text-slate-400 disabled:opacity-25 p-2 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zm2-8.14 4.77 2.14L8 14.14V9.86zM16 6h2v12h-2z"/>
              </svg>
            </button>

            <button
              onClick={() => onRepeatChange(REPEAT_NEXT[repeatMode])}
              title={repeatMode === 'none' ? 'リピートなし' : repeatMode === 'all' ? '全曲リピート' : '1曲リピート'}
              className={`p-2 rounded-lg transition-colors text-lg ${
                repeatMode !== 'none' ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {REPEAT_LABEL[repeatMode]}
            </button>
          </div>

          {/* 速度 + 音量 */}
          <div className="flex items-center gap-3 mb-1">
            <div className="flex gap-1.5">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackRate(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    speed === s ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <button
                onClick={toggleMute}
                title={isMuted ? 'ミュート解除' : 'ミュート'}
                className="text-slate-400 hover:text-white transition-colors text-base flex-shrink-0"
              >
                {volumeIcon}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={effectiveVolume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 ${effectiveVolume * 100}%, #334155 ${effectiveVolume * 100}%)`,
                }}
              />
            </div>
          </div>

          {/* デバッグ情報 */}
          <p className="text-slate-600 text-[10px] text-center mt-1 font-mono">
            [DBG] ct={currentTime.toFixed(1)}s dur={duration.toFixed(1)}s playing={isPlaying ? 'Y' : 'N'} ready={audioRef.current?.readyState ?? '?'}
          </p>

          {/* キーボードショートカット（デスクトップのみ） */}
          <p className="text-slate-700 text-[10px] text-center hidden sm:block">
            Space: 再生/停止 · ← →: ±15秒 · ↑↓: 音量 · M: ミュート
          </p>
        </div>
      )}
    </>
  );
}
