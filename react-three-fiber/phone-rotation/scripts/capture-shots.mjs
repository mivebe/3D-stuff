// renders the phone at fixed poses (via ?capture=<id>) and saves beauty stills
// into public/shots/<id>.jpg for the Details section. run: node scripts/capture-shots.mjs
import puppeteer from "../../../dashboard/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = resolve(root, "dist");
const shotsDir = resolve(root, "public", "shots");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    res.setHeader(
      "Content-Type",
      MIME[extname(p)] || "application/octet-stream",
    );
    res.end(await readFile(join(distDir, p)));
  } catch {
    res.statusCode = 404;
    res.end("not found");
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

await mkdir(shotsDir, { recursive: true });
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

// 3:4 cards in the Details grid
for (const id of ["champagne", "graphite", "midnight"]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${port}/index.html?capture=${id}`, {
    waitUntil: "networkidle0",
    timeout: 45000,
  });
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({
    path: join(shotsDir, `${id}.jpg`),
    type: "jpeg",
    quality: 88,
  });
  console.log(`shot ${id}`);
  await page.close();
}

await browser.close();
server.close();
console.log("done ->", shotsDir);
