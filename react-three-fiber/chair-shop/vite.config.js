import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// relative base so the build works when embedded under any subpath (iframe)
export default defineConfig({
  base: "./",
  plugins: [react()],
});
