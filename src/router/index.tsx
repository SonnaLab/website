import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/Layout';
import Home from '../pages/Home';
import Contact from '../pages/Contact';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><Home /></Layout>,
  },
  {
    path: '/contact',
    element: <Layout><Contact /></Layout>,
  },
]);