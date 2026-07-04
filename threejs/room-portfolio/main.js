import * as THREE from "three";
import "./style.css";
import App from "./src/App.js";

const Application = new App(document.getElementById("canvas"));

// handy for debugging in the console
window.__app = Application;
window.THREE = THREE;
