import React from "react";
import { createRoot } from "react-dom/client";
import FpsControls from "./FpsControls.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FpsControls />
  </React.StrictMode>,
);
