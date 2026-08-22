import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function AccessDenied() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const home = user?.role === 'AMBULANCE_CREW' ? '/crew' : user?.role === 'DISPATCHER' ? '/dispatcher' : '/hospital';

  return (
    <div className="min-h-screen bg-[#0a0f2e] flex items-center justify-center">
      <div className="bg-[#12183d] rounded-2xl border border-[rgba(255,255,255,0.08)] p-12 max-w-md text-center">
        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-red-400 text-2xl">🔒</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 text-sm mb-6">You don't have permission to access this resource.</p>
        <button onClick={() => navigate(home)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          Go to My Dashboard
        </button>
      </div>
    </div>
  );
}
