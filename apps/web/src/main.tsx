import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { AuthBootstrap } from './components/auth/AuthBootstrap';
import './assets/main.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('未找到根节点 #root');
}

const router = createBrowserRouter([{ path: '*', element: <><AuthBootstrap /><App /></> }]);

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
