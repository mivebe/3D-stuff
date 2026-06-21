// drives the room-portfolio slice in a real browser: tests WASD movement and
// collision clamp, opens all doors, pops the info panel, screenshots each check.
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const DIST = '/Users/mihailbezev/Programming/mivebe/3D-stuff/threejs/room-portfolio/dist'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

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
  } catch { res.statusCode = 404; res.end('not found') }
})
await new Promise((r) => server.listen(0, r))
const port = server.address().port
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1100, height: 700, deviceScaleFactor: 1 })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'networkidle0', timeout: 45000 })
await page.waitForSelector('.start:not(.hidden)', { timeout: 30000 })
await page.click('.start button')
await wait(400)

const locked = await page.evaluate(() => document.pointerLockElement !== null)

// 1. movement: press W, measure travel
const before = await page.evaluate(() => ({ ...window.__app.player.position }))
await page.keyboard.down('w'); await wait(700); await page.keyboard.up('w')
await wait(100)
const after = await page.evaluate(() => ({ ...window.__app.player.position }))
const moved = Math.hypot(after.x - before.x, after.z - before.z)

// 2. collision: face the tv wall and push for over a second, must stay in floor
const clampInfo = await page.evaluate(async () => {
  const app = window.__app
  const fb = app.world.room.floorBounds
  app.player.yaw = Math.PI / 2 // toward -x tv wall
  return { minx: fb.min.x, maxx: fb.max.x, minz: fb.min.z, maxz: fb.max.z }
})
await page.keyboard.down('w'); await wait(1300); await page.keyboard.up('w')
await wait(100)
const wallPos = await page.evaluate(() => ({ ...window.__app.player.position }))
const insideFloor = wallPos.x >= clampInfo.minx - 0.5 && wallPos.x <= clampInfo.maxx + 0.5 &&
  wallPos.z >= clampInfo.minz - 0.5 && wallPos.z <= clampInfo.maxz + 0.5

// 3. open every door + tv on, aim at an upper-door wall, screenshot
const aim = await page.evaluate(() => {
  const THREE = window.THREE
  const room = window.__app.world.room
  const p = window.__app.player
  room.toggleTV()
  room.doors.forEach((d) => room.toggleDoor(d))

  const node = room.model.getObjectByName('Door_Upper_02')
  if (!node) return null
  const v = new THREE.Vector3()
  node.getWorldPosition(v)
  const wp = { x: v.x, y: v.y, z: v.z }
  // horizontal dir from door toward room center
  let dx = 0 - wp.x, dz = 0 - wp.z
  const h = Math.hypot(dx, dz) || 1
  dx /= h; dz /= h
  p.position.x = wp.x + dx * 2.4
  p.position.z = wp.z + dz * 2.4
  // look back at the door
  const fx = wp.x - p.position.x, fz = wp.z - p.position.z
  const fy = wp.y - (room.floorY + 1.6)
  const fh = Math.hypot(fx, fz) || 1
  p.yaw = Math.atan2(-fx, -fz)
  p.pitch = Math.atan2(fy, fh)
  return { wp, pos: { x: p.position.x, z: p.position.z }, yaw: p.yaw, pitch: p.pitch }
})
await wait(900)
await page.screenshot({ path: '/tmp/room-doors.png', type: 'png' })

// 4. info panel
await page.evaluate(() => {
  const room = window.__app.world.room
  const node = room.model.getObjectByName('pc_plate_1')
  node && node.userData.interactive.toggle()
})
await wait(400)
const panelOpen = await page.evaluate(() => window.__app.panel.isOpen)
await page.screenshot({ path: '/tmp/room-panel.png', type: 'png' })

console.log(JSON.stringify({
  locked, moved: +moved.toFixed(3), wallPos, insideFloor, aim, panelOpen,
}, null, 2))
console.log('LOGS:\n' + logs.filter((l) => !l.includes('GL Driver') && !l.includes('ReadPixels')).join('\n'))
await browser.close()
server.close()
