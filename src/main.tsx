import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { ModalProvider } from './components/providers/ModalProvider';
import { ConsultationModal } from './components/modals/ConsultationModal';

import { router } from "./router";
import "./index.css";
import "./i18n/config.ts";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ModalProvider>
      <RouterProvider router={router} />
      {/* Modal global accessible partout */}
      <ConsultationModal />
    </ModalProvider>
  </HelmetProvider>
);