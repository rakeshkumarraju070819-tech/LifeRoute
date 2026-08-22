import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    navigate('/login', { replace: true });
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
        <div className="bg-[#080c1e] border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Reset Password</h1>
          <p className="text-slate-400 text-sm mb-8">Choose a new password for your account.</p>
          {error && <p className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-slate-300 text-sm font-medium">
              New Password
              <input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8}
                className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
            </label>
            <label className="block text-slate-300 text-sm font-medium">
              Confirm Password
              <input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={8}
                className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
            </label>
            <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold transition-colors">Reset Password</button>
          </form>
          <p className="text-center text-slate-500 text-sm mt-5"><Link to="/login" className="text-blue-400 hover:text-blue-300">Back to Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}