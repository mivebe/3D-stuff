/**
 * @type {import('vite').UserConfig}
 */
// relative base so the build works when embedded under any subpath (dashboard iframe)
export default {
  base: "./",
  build: {
    sourcemap: true,
  },
};
