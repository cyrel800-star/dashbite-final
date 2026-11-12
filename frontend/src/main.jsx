import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./ui/ui.css";

// Mount the application and enable React's development checks.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
