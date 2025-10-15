import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";
import "./i18n/config.ts";

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);