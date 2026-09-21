import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";
import Privacy from "./Privacy";

const root = document.getElementById("root")!;
const isPrivacy = window.location.pathname === "/privacy";

createRoot(root).render(
  <StrictMode>{isPrivacy ? <Privacy /> : <App />}</StrictMode>,
);