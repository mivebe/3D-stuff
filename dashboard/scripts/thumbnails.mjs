// screenshots each built project into public/thumbnails/<id>.jpg for the cards.
// run AFTER build-projects.mjs (it serves public/projects/<id>/). drives the
// installed Google Chrome via puppeteer-core. usage: node scripts/thumbnails.mjs [id...]
import puppeteer from "puppeteer-core";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projects } from "../src/projects.js";

const dashboardRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = resolve(dashboardRoot, "public");
const thumbsDir = resolve(publicDir, "thumbnails");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  ".mp3": "audio/mpeg",
  ".wasm": "application/wasm",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const data = await readFile(join(publicDir, p));
    res.setHeader(
      "Content-Type",
      MIME[extname(p)] || "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

await mkdir(thumbsDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
  ],
});

const only = process.argv.slice(2);
const selected = only.length
  ? projects.filter((p) => only.includes(p.id))
  : projects;

for (const proj of selected) {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 500, deviceScaleFactor: 1 });
  try {
    // thumbQuery lets a project ask for a more representative state in the shot
    const url = `http://localhost:${port}/projects/${proj.id}/index.html${proj.thumbQuery ?? ""}`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });
    await new Promise((r) => setTimeout(r, proj.thumbWait ?? 3800));
    await page.screenshot({
      path: join(thumbsDir, `${proj.id}.jpg`),
      type: "jpeg",
      quality: 80,
    });
    console.log(`thumb: ${proj.id}`);
  } catch (e) {
    console.error(`thumb failed: ${proj.id} - ${e.message}`);
  }
  await page.close();
}

await browser.close();
server.close();
console.log("done");
