import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppPreferencesProvider } from './context/AppPreferences';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <AppPreferencesProvider>
        <RouterProvider router={router} />
      </AppPreferencesProvider>
    </AuthProvider>
  );
}
