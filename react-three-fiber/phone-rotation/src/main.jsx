import React from "react";
import { createRoot } from "react-dom/client";
import PhoneShowcase from "./PhoneShowcase.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PhoneShowcase />
  </React.StrictMode>,
);
