import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/Layout';
import Home from '../pages/Home';
import Contact from '../pages/Contact';
import Projects from '../pages/Projects';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><Home /></Layout>,
  },
  {
    path: '/contact',
    element: <Layout><Contact /></Layout>,
  },
  {
    path: '/projects',
    element: <Layout><Projects /></Layout>,
  },
]);