import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { router } from './routes';
import { initializeSeedData } from './data/seedData';
import { STORAGE_KEYS } from './data/constants';

export default function App() {
  useEffect(() => {
    initializeSeedData();
  }, []);

  const handleReset = () => {
    if (window.confirm('Reset all demo data?')) {
      // Clear using the actual keys the app uses
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
      initializeSeedData(true);
      window.location.reload();
    }
  };

  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <button 
        onClick={handleReset}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '8px 16px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}
      >
        Reset Demo Data
      </button>
    </AuthProvider>
  );
}
