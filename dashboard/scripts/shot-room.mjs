// one-off: screenshot the room-portfolio slice from inside the room.
// serves room-portfolio/dist, dismisses the start overlay, captures the view.
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const DIST = '/Users/mihailbezev/Programming/mivebe/3D-stuff/threejs/room-portfolio/dist'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = process.argv[2] || '/tmp/room-slice.png'

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream', '.wasm': 'application/wasm', '.webm': 'video/webm', '.ico': 'image/x-icon',
}

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0])
    if (p.endsWith('/')) p += 'index.html'
    const data = await readFile(join(DIST, p))
    res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream')
    res.end(data)
  } catch {
    res.statusCode = 404
    res.end('not found')
  }
})
await new Promise((r) => server.listen(0, r))
const port = server.address().port

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1100, height: 700, deviceScaleFactor: 1 })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle0', timeout: 45000 })
// wait for worldready (start overlay revealed)
await page.waitForSelector('.start:not(.hidden)', { timeout: 30000 }).catch(() => logs.push('start never shown'))
await page.click('.start button').catch(() => logs.push('no start button'))
await new Promise((r) => setTimeout(r, 1500))

// also flip the tv and open the door directly so the screenshot shows them, via the singleton
await page.evaluate(() => {
  const app = window.__app
  if (app && app.world && app.world.room) {
    app.world.room.toggleTV()
    const d = app.world.room.doors[0]
    if (d) app.world.room.toggleDoor(d)
  }
}).catch(() => {})
await new Promise((r) => setTimeout(r, 900))

await page.screenshot({ path: OUT, type: 'png' })
console.log('LOGS:\n' + logs.join('\n'))
console.log('shot saved', OUT)
await browser.close()
server.close()
