import React from "react";
import { createRoot } from "react-dom/client";
import AppShell from "./AppShell.jsx";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./tailwind.css";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppShell />
    <SpeedInsights />
  </React.StrictMode>
);
