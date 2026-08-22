import { useState } from 'react';
import { Link } from 'react-router';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#03071e] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">EI</span>
          </div>
          <span className="text-white font-semibold">Emergency Intelligence</span>
        </Link>

        {!sent ? (
          <div className="bg-[#080c1e] border border-white/10 rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white mb-1">Forgot Password</h1>
            <p className="text-slate-400 text-sm mb-8">Enter your email and we'll send a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                  placeholder="you@organization.com" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg py-3 font-semibold transition-colors flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</> : 'Send Reset Link'}
              </button>
            </form>
            <p className="text-center text-slate-500 text-sm mt-5">
              <Link to="/login" className="text-blue-400 hover:text-blue-300">← Back to Sign In</Link>
            </p>
          </div>
        ) : (
          <div className="bg-[#080c1e] border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">✉</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Password reset link sent</h1>
            <p className="text-slate-400 text-sm mb-6">
              Check <span className="text-blue-400">{email}</span> for instructions to reset your password.
            </p>
            <Link to="/reset-password" className="block text-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold transition-colors mb-4">Continue to Reset Password</Link>
            <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">← Back to Sign In</Link>
          </div>
        )}
      </div>
    </div>
  );
}
