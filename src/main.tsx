import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { useAuth } from "./auth/store";
import "./index.css";

useAuth.getState().hydrate();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
