import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installStorage } from "./storage";
import App from "./App";

installStorage();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
