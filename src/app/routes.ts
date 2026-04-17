import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import RequireAuth from './components/RequireAuth';

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: async () => ({
      Component: (await import('./pages/Login')).default,
    }),
  },
  {
    Component: RequireAuth,
    children: [
      {
        path: '/',
        Component: Layout,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('./pages/Dashboard')).default,
            }),
          },
          {
            path: 'tendencias',
            lazy: async () => ({
              Component: (await import('./pages/Trends')).default,
            }),
          },
          {
            path: 'analisis',
            lazy: async () => ({
              Component: (await import('./pages/Analytics')).default,
            }),
          },
          {
            path: 'configuracion',
            lazy: async () => ({
              Component: (await import('./pages/Settings')).default,
            }),
          },
          {
            path: '*',
            lazy: async () => ({
              Component: (await import('./pages/NotFound')).default,
            }),
          },
        ],
      },
    ],
  },
]);
