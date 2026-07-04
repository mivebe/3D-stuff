/**
 * @type {import('vite').UserConfig}
 */
// relative base so the build works when embedded under any subpath (dashboard iframe).
// runtime asset paths (models/draco/videos) are prefixed with import.meta.env.BASE_URL
// so they resolve relative to index.html instead of the origin root.
export default {
  base: "./",
};
