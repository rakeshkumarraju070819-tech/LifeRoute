import { createBrowserRouter, Navigate } from 'react-router';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import DashboardLayout from './layouts/DashboardLayout';
import AmbulanceDashboard from './pages/ambulance/Dashboard';
import AmbulanceHistory from './pages/ambulance/History';
import DispatcherDashboard from './pages/dispatcher/Dashboard';
import HospitalDashboard from './pages/hospital/Dashboard';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import AccessDenied from './pages/AccessDenied';

function RequireRole({ role }: { role: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <AccessDenied />;
  return <DashboardLayout />;
}

function RequireAuth() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <DashboardLayout />;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'AMBULANCE_CREW') return <Navigate to="/crew" replace />;
  if (user.role === 'DISPATCHER') return <Navigate to="/dispatcher" replace />;
  return <Navigate to="/hospital" replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <SignUp /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/dashboard', element: <RoleRedirect /> },

  // Ambulance Crew routes
  {
    path: '/crew',
    element: <RequireRole role="AMBULANCE_CREW" />,
    children: [
      { index: true, element: <AmbulanceDashboard /> },
      { path: 'emergency', element: <AmbulanceDashboard /> },
      { path: 'navigation', element: <AmbulanceDashboard /> },
      { path: 'history', element: <AmbulanceHistory /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'profile', element: <Profile /> },
    ],
  },

  // Dispatcher routes
  {
    path: '/dispatcher',
    element: <RequireRole role="DISPATCHER" />,
    children: [
      { index: true, element: <DispatcherDashboard /> },
      { path: 'emergencies', element: <DispatcherDashboard /> },
      { path: 'fleet', element: <DispatcherDashboard /> },
      { path: 'map', element: <DispatcherDashboard /> },
      { path: 'hospitals', element: <DispatcherDashboard /> },
      { path: 'history', element: <DispatcherDashboard /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'profile', element: <Profile /> },
    ],
  },

  // Hospital Staff routes
  {
    path: '/hospital',
    element: <RequireRole role="HOSPITAL_STAFF" />,
    children: [
      { index: true, element: <HospitalDashboard /> },
      { path: 'capacity', element: <HospitalDashboard /> },
      { path: 'incoming', element: <HospitalDashboard /> },
      { path: 'readiness', element: <HospitalDashboard /> },
      { path: 'history', element: <HospitalDashboard /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'profile', element: <Profile /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
