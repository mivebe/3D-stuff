import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// served from https://<user>.github.io/3D-stuff/ in production, root in dev.
// BASE_PATH lets CI (or a custom domain) override the subpath.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? process.env.BASE_PATH || '/3D-stuff/' : '/',
  plugins: [react()],
}))
