import { chromium } from 'playwright'

const API = 'https://sitright-backend-api.onrender.com/api/v1'
const NEUTRAL = { ax: 0, ay: 0, az: 1 }
// Dorsal "adecuado" según el modelo (centroide de la clase adequate del dataset),
// ~8° del neutro de calibración → en rango geométrico Y adequate para el modelo.
const ADEQUATE_DORSAL = { ax: 0.06, ay: -0.12, az: 0.95 }
const CERV_DEV = { ax: 0.53, ay: 0, az: 0.848 } // ~32° del neutro
const LUMB_DEV = { ax: 0.438, ay: 0, az: 0.899 } // ~26°
const DORS_DEV = { ax: 0.374, ay: 0, az: 0.927 } // ~22° (zona desviada, modelo aún adequate)

const N = 40
function jit(v) {
  return [v.ax + (Math.random() - 0.5) * 0.04, v.ay + (Math.random() - 0.5) * 0.04, v.az + (Math.random() - 0.5) * 0.02]
}
function planStep(i) {
  let cerv = NEUTRAL
  let lumb = NEUTRAL
  let dors = ADEQUATE_DORSAL
  if (i >= 8 && i <= 19) cerv = CERV_DEV // bloque cervical sostenido (carga mayor)
  else if (i === 3 || i === 25 || i === 30) cerv = CERV_DEV // disperso
  if (i >= 22 && i <= 26) lumb = LUMB_DEV // bloque lumbar
  if (i === 33 || i === 34 || i === 35) dors = DORS_DEV // dorsal leve
  return { cervical: jit(cerv), dorsal: jit(dors), lumbar: jit(lumb) }
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 }, ignoreHTTPSErrors: true, deviceScaleFactor: 2 })
const page = await ctx.newPage()

await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle' })
await page.fill('#email', 'demo@sitright.app'); await page.fill('#password', 'Demo1234!')
await page.click('button[type=submit]')
await page.waitForSelector('text=Buen día', { timeout: 90000 })
const token = await page.evaluate(() => localStorage.getItem('sitright.access_token'))
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

const vest = await (await page.request.get(`${API}/vests/me`, { headers: auth })).json()
console.log('vest', vest.id, vest.mac_address)

// 1. Recalibrar a neutro conocido [0,0,1]
const cal = await page.request.post(`${API}/vests/${vest.id}/calibrate`, {
  headers: auth, data: { cervical: NEUTRAL, dorsal: NEUTRAL, lumbar: NEUTRAL },
})
console.log('calibrate', cal.status())

// 2. Cerrar cualquier sesión activa vieja, luego crear una fresca
const activeRes = await page.request.get(`${API}/sessions/active`, { headers: auth })
if (activeRes.status() === 200) {
  const active = await activeRes.json()
  await page.request.post(`${API}/sessions/${active.id}/close`, { headers: auth, data: {} })
  console.log('cerrada sesión activa vieja', active.id)
}
const s = await (await page.request.post(`${API}/sessions`, { headers: auth, data: { vest_device_id: vest.id } })).json()
const sid = s.id
console.log('session', sid)

// 3. Inyectar lecturas (cada ~4 s, timestamp del servidor)
for (let i = 0; i < N; i++) {
  const p = planStep(i)
  await page.request.post(`${API}/readings`, {
    headers: { 'Content-Type': 'application/json' },
    data: { vest_id: vest.mac_address, ...p, battery_percent: 90 },
  })
  if (i % 8 === 0) console.log(`  reading ${i + 1}/${N}`)
  await page.waitForTimeout(4000)
}

// 4. Cerrar sesión
const cl = await page.request.post(`${API}/sessions/${sid}/close`, { headers: auth, data: {} })
console.log('close', cl.status())

// 5. Verificar zone-analysis real
const za = await (await page.request.get(`${API}/sessions/${sid}/zone-analysis`, { headers: auth })).json()
console.log('ZONE-ANALYSIS:', JSON.stringify(za))

// 6. Capturar el reporte en el frontend
await page.goto(`http://localhost:5174/history/${sid}`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=Mapa postural', { timeout: 60000 }).catch(() => {})
await page.waitForTimeout(2500)
await page.screenshot({ path: '_seed_report.png', fullPage: true })
console.log('SESSION_URL', `/history/${sid}`)
await ctx.close(); await browser.close()
