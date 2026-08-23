import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setLoaded(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password, remember);
    setLoading(false);
    if (!result.success) { setError(result.error ?? 'Login failed.'); return; }
    navigate('/dashboard');
  };

  const demoLogin = (role: 'crew' | 'dispatch' | 'hospital') => {
    const creds = { crew: ['crew@demo.com', 'demo1234'], dispatch: ['dispatch@demo.com', 'demo1234'], hospital: ['hospital@demo.com', 'demo1234'] };
    setEmail(creds[role][0]); setPassword(creds[role][1]);
  };

  return (
    <div className={`flex flex-1 w-full max-w-[1400px] mx-auto px-8 transition-opacity duration-700 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center py-12 pr-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold">EI</span>
            </div>
            <span className="text-white font-semibold text-lg">Emergency Intelligence</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">Coordinating emergency response in real time.</h2>
          <p className="text-slate-400 text-lg">Every second matters. Secure, role-based access for crews, dispatchers, and hospitals.</p>
        </div>
        <div className="space-y-4 max-w-md">
          {[
            { icon: '🚑', label: 'Ambulance Crew', desc: 'Navigation & status updates' },
            { icon: '📡', label: 'Dispatcher', desc: 'Fleet coordination & emergency management' },
            { icon: '🏥', label: 'Hospital Staff', desc: 'Capacity management & incoming alerts' },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-4 bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-xl px-5 py-4">
              <span className="text-2xl">{r.icon}</span>
              <div>
                <p className="text-white text-sm font-medium">{r.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md bg-[#0c1230]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Sign in to your account</h1>
            <p className="text-slate-400 text-sm">Access your role-based emergency dashboard</p>
          </div>

          {/* Demo buttons */}
          <div className="mb-8 space-y-3">
            <p className="text-slate-500 text-xs font-mono tracking-wider">— DEMO ACCOUNTS —</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Crew', role: 'crew' as const },
                { label: 'Dispatcher', role: 'dispatch' as const },
                { label: 'Hospital', role: 'hospital' as const },
              ].map(d => (
                <button key={d.role} onClick={() => demoLogin(d.role)}
                  className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg px-2 py-2 transition-colors font-medium">
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="you@organization.com" />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm font-medium">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-blue-500 bg-white/5 focus:ring-blue-500 focus:ring-offset-0" />
                <span className="text-slate-400 text-sm">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl py-3.5 font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-8">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
