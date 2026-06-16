'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/app');
      } else {
        setError('パスワードが違います');
        setPassword('');
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4 select-none">🎧</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">音声コンテンツ</h1>
          <p className="text-slate-400 text-sm mt-1">ログインしてください</p>
        </div>

        {/* カード */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* パスワード入力 */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                autoFocus
                autoComplete="current-password"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-lg p-1"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* エラー */}
            {error && (
              <p className="text-red-400 text-sm text-center animate-fade-in">{error}</p>
            )}

            {/* ボタン */}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-blue-500 hover:bg-blue-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block">⟳</span>
                  ログイン中...
                </>
              ) : (
                'ログイン'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
