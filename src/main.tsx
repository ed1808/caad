import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Deshabilitar el menú contextual del clic derecho en modo producción / build
if (import.meta.env.PROD) {
  const disableContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };
  document.addEventListener("contextmenu", disableContextMenu, { capture: true });
  window.addEventListener("contextmenu", disableContextMenu, { capture: true });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
