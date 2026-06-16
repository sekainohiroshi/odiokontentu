'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Track } from '@/lib/types';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

interface Props {
  track: Track | null;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function AudioPlayer({ track, onPrev, onNext, hasPrev, hasNext }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');

  // トラック切り替えで再生開始
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.blobUrl) return;
    audio.src = track.blobUrl;
    audio.playbackRate = speed;
    setError('');
    setCurrentTime(0);
    setDuration(0);
    audio.play().catch((e: Error) => setError(e.message));
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => onNext(), [onNext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); handleNext(); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => setError('再生に失敗しました');

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
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
    navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler('previoustrack', onPrev);
    navigator.mediaSession.setActionHandler('nexttrack', onNext);
    navigator.mediaSession.setActionHandler('seekbackward', () => skip(-15));
    navigator.mediaSession.setActionHandler('seekforward', () => skip(15));
  }, [track, onPrev, onNext]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!track) return null;

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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-4 pt-3 pb-7 safe-area-bottom">
      <audio ref={audioRef} />

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
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500 mb-3">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* コントロール */}
      <div className="flex items-center justify-between mb-3 px-2">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="text-slate-400 disabled:opacity-25 p-2 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
          </svg>
        </button>
        <button onClick={() => skip(-15)} className="text-slate-400 p-2 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            <text x="12" y="15" textAnchor="middle" fontSize="6" fill="currentColor">15</text>
          </svg>
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
        <button onClick={() => skip(15)} className="text-slate-400 p-2 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
            <text x="12" y="15" textAnchor="middle" fontSize="6" fill="currentColor">15</text>
          </svg>
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
      </div>

      {/* 速度ボタン */}
      <div className="flex gap-2 justify-center">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setPlaybackRate(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              speed === s
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
