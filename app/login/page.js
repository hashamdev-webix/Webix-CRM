'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password');
      setLoading(false);
    } else {
      // Hard redirect so middleware picks up the fresh session cookie
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden relative">

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600 rounded-full opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-800 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-900 rounded-full opacity-10 animate-ping" style={{ animationDuration: '4s' }} />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20   mb-5"
            style={{ animation: 'float 3s ease-in-out infinite' }}>
               <Image
                            src="/logo.jpeg"
                            alt="Walshkon logo"
                            width={82}
                            height={82}
                            className="rounded-lg transition-transform duration-300 group-hover:scale-105"
                          />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Webix CRM</h1>
          <p className="text-zinc-500 mt-2 text-sm">Sign in to your dashboard</p>
        </div>
 
        {/* Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden">

          {/* Red top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-red-700 via-red-500 to-red-700" />

          <div className="p-8">
            <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-zinc-500 text-sm mb-7">Enter your credentials to continue</p>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Email address
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    placeholder="admin@webixsolutions.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 group-hover:border-zinc-600"
                  />
                </div>
              </div>
 
              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Password
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-4 py-3 pr-11 text-sm outline-none transition-all duration-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 group-hover:border-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-950/60 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 hover:shadow-red-700/40 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6">
          Webix Solutions &copy; {new Date().getFullYear()}
        </p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
