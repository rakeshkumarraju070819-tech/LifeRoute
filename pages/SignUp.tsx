import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth, type Role } from '../context/AuthContext';

type Step = 'form' | 'success';

function pwStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500'];

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    role: '' as Role | '', organization: '',
    ambulanceId: '', employeeId: '', dispatchCenter: '', department: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!form.email.includes('@')) e.email = 'Valid email required.';
    if (!form.phone.trim()) e.phone = 'Phone number is required.';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    if (!form.role) e.role = 'Please select a role.';
    if (!form.organization.trim()) e.organization = 'Organization is required.';
    if (!agreed) e.agreed = 'You must agree to the terms.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await signup({ ...form, role: form.role as Role });
    setLoading(false);
    if (!result.success) { setErrors({ form: result.error ?? 'Signup failed.' }); return; }
    setStep('success');
  };

  const strength = pwStrength(form.password);

  if (step === 'success') return (
    <div className="min-h-screen bg-[#03071e] flex items-center justify-center px-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-12 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Account Created Successfully</h1>
        <p className="text-slate-400 mb-2">Your account is awaiting verification.</p>
        <p className="text-slate-500 text-sm mb-8">Our team will review your account and send a confirmation to <span className="text-blue-400">{form.email}</span>.</p>
        <button onClick={() => navigate('/login')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold transition-colors">
          Continue to Sign In
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#03071e] py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">EI</span>
            </div>
            <span className="text-white font-semibold">Emergency Intelligence</span>
          </Link>
        </div>

        <div className="bg-[#080c1e] border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-slate-400 text-sm mb-8">Join the emergency response network</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.form && <p className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{errors.form}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Full Name *</label>
                <input value={form.name} onChange={set('name')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                  placeholder="Marcus Reid" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Phone Number *</label>
                <input value={form.phone} onChange={set('phone')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                  placeholder="+1 555-0100" />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Email Address *</label>
              <input type="email" value={form.email} onChange={set('email')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                placeholder="you@organization.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Password *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{showPw ? 'Hide' : 'Show'}</button>
                </div>
                {form.password && (
                  <div className="mt-1.5">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? STRENGTH_COLOR[strength] : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">{STRENGTH[strength]}</p>
                  </div>
                )}
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Confirm Password *</label>
                <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                  placeholder="Repeat password" />
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Role *</label>
              <select value={form.role} onChange={set('role')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm">
                <option value="" className="bg-slate-900">Select your role…</option>
                <option value="AMBULANCE_CREW" className="bg-slate-900">Ambulance Crew</option>
                <option value="DISPATCHER" className="bg-slate-900">Dispatcher</option>
                <option value="HOSPITAL_STAFF" className="bg-slate-900">Hospital Staff</option>
              </select>
              {errors.role && <p className="text-red-400 text-xs mt-1">{errors.role}</p>}
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Organization *</label>
              <input value={form.organization} onChange={set('organization')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Metro Ambulance Service / City General Hospital…" />
              {errors.organization && <p className="text-red-400 text-xs mt-1">{errors.organization}</p>}
            </div>

            {/* Role-specific fields */}
            {form.role === 'AMBULANCE_CREW' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Ambulance ID</label>
                  <input value={form.ambulanceId} onChange={set('ambulanceId')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm font-mono"
                    placeholder="AMB-042" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">License / Employee ID</label>
                  <input value={form.employeeId} onChange={set('employeeId')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm font-mono"
                    placeholder="EMP-2847" />
                </div>
              </div>
            )}

            {form.role === 'DISPATCHER' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Dispatch Center</label>
                  <input value={form.dispatchCenter} onChange={set('dispatchCenter')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Central-1" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Employee ID</label>
                  <input value={form.employeeId} onChange={set('employeeId')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm font-mono"
                    placeholder="DSP-1193" />
                </div>
              </div>
            )}

            {form.role === 'HOSPITAL_STAFF' && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Hospital Name</label>
                  <input value={form.organization} onChange={set('organization')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="City General" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Department</label>
                  <input value={form.department} onChange={set('department')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Emergency Medicine" />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Employee ID</label>
                  <input value={form.employeeId} onChange={set('employeeId')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm font-mono"
                    placeholder="HSP-5512" />
                </div>
              </div>
            )}

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-blue-500" />
              <span className="text-slate-400 text-sm">I agree to the <span className="text-blue-400">Terms of Service</span> and <span className="text-blue-400">Privacy Policy</span>. I understand that access to emergency systems requires verification.</span>
            </label>
            {errors.agreed && <p className="text-red-400 text-xs">{errors.agreed}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg py-3 font-semibold transition-colors flex items-center justify-center gap-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
