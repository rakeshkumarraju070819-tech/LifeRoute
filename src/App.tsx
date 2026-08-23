import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <button
          onClick={handleReset}
          className="fixed bottom-5 right-5 z-[9999] px-4 py-2 rounded-lg text-sm font-medium bg-critical text-white shadow-lg hover:opacity-90 transition-opacity"
        >
          Reset Demo Data
        </button>
      </AuthProvider>
    </ThemeProvider>
  );
}
