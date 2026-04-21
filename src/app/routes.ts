import { createElement } from 'react';
import { Navigate, createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import RequireAuth from './components/RequireAuth';

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => ({
      Component: (await import('./pages/Landing')).default,
    }),
  },
  {
    path: '/login',
    lazy: async () => ({
      Component: (await import('./pages/Login')).default,
    }),
  },
  {
    path: '/tendencias',
    element: createElement(Navigate, { to: '/app/tendencias', replace: true }),
  },
  {
    path: '/analisis',
    element: createElement(Navigate, { to: '/app/analisis', replace: true }),
  },
  {
    path: '/configuracion',
    element: createElement(Navigate, { to: '/app/configuracion', replace: true }),
  },
  {
    Component: RequireAuth,
    children: [
      {
        path: '/app',
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
