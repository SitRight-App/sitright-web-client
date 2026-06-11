import { chromium } from 'playwright'
const SID='52184d53-e9db-4c53-9ef1-2e6ec40c5a07'
const b=await chromium.launch()
const c=await b.newContext({viewport:{width:1300,height:1200},ignoreHTTPSErrors:true,deviceScaleFactor:2})
const p=await c.newPage()
await p.goto('http://localhost:5174/login',{waitUntil:'networkidle'})
await p.fill('#email','demo@sitright.app');await p.fill('#password','Demo1234!');await p.click('button[type=submit]')
await p.waitForSelector('text=Buen día',{timeout:90000})
await p.goto(`http://localhost:5174/history/${SID}`,{waitUntil:'networkidle'})
await p.waitForSelector('text=Mapa postural',{timeout:60000});await p.waitForTimeout(2000)
await p.locator('section').filter({hasText:'Detalle para seguimiento'}).first().screenshot({path:'_rep_zone.png'})
console.log('ok');await c.close();await b.close()
