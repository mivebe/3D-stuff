// builds every standalone project listed in src/projects.js and copies its
// production build into public/projects/<id>/ so the dashboard can iframe it.
// each source project uses vite base './' so the bundle works under any subpath.
import { execSync } from "node:child_process";
import { existsSync, rmSync, cpSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projects } from "../src/projects.js";

const here = dirname(fileURLToPath(import.meta.url));
const dashboardRoot = resolve(here, "..");
const outRoot = resolve(dashboardRoot, "public/projects");

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });

// only vite projects are supported today; bail loudly on anything else
const unsupported = projects.filter((p) => p.tool !== "vite");
if (unsupported.length) {
  throw new Error(
    `unsupported tool(s): ${unsupported.map((p) => `${p.id}:${p.tool}`).join(", ")}`,
  );
}

for (const project of projects) {
  const source = resolve(dashboardRoot, project.source);
  if (!existsSync(source))
    throw new Error(`missing source for ${project.id}: ${source}`);

  console.log(`\n=== ${project.id} (${source}) ===`);
  // plain install (not ci) so drifted per-project lockfiles still resolve
  run("npm install --no-audit --no-fund", source);
  run("npm run build", source);

  const dist = resolve(source, "dist");
  if (!existsSync(dist) || readdirSync(dist).length === 0) {
    throw new Error(`build produced no dist for ${project.id}: ${dist}`);
  }

  const dest = resolve(outRoot, project.id);
  rmSync(dest, { recursive: true, force: true });
  cpSync(dist, dest, { recursive: true });
  console.log(`-> copied to ${dest}`);
}

console.log(`\nbuilt ${projects.length} project(s) into ${outRoot}`);
