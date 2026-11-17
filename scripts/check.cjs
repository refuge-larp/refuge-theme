const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch();
 for (const width of [320, 390, 1440]) {
  for (const reducedMotion of ['no-preference', 'reduce']) {
   const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion });
   const errors = []; const failures = [];
   page.on('pageerror', error => errors.push(error.message));
   page.on('response', response => { if (response.url().startsWith('http://127.0.0.1:8799/') && response.status() >= 400) failures.push(response.url()); });
   await page.goto('http://127.0.0.1:8799/');
   await page.waitForFunction(() => [...document.querySelectorAll('.mosaic img')].every(image => image.complete && image.naturalWidth > 0));
   await page.waitForTimeout(800);
   const facts = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    language: document.documentElement.lang,
    headings: document.querySelectorAll('h1').length,
    photos: document.querySelectorAll('.mosaic img').length,
    hiddenPhotos: [...document.querySelectorAll('.mosaic .tile')].some(tile => getComputedStyle(tile).opacity === '0'),
    brokenFragments: [...document.querySelectorAll('a[href^="#"]')].filter(link => !document.getElementById(link.hash.slice(1))).map(link => link.hash)
   }));
   if (errors.length || failures.length || facts.overflow || facts.language !== 'en' || facts.headings !== 1 || !facts.photos || facts.hiddenPhotos || facts.brokenFragments.length) throw Error(JSON.stringify({ width, reducedMotion, errors, failures, facts }));
   await page.locator('#theme').selectOption('earth');
   if (await page.locator('html').getAttribute('data-theme') !== 'earth') throw Error('Theme selector failed');
   await page.locator('.mosaic .tile').first().click();
   await page.locator('#photo-dialog').waitFor({ state: 'visible' });
   await page.keyboard.press('ArrowRight');
   await page.keyboard.press('Escape');
   if (!(await page.locator('.mosaic .tile').first().evaluate(element => element === document.activeElement))) throw Error('Lightbox did not return focus');
   console.log(`PASS ${width}px ${reducedMotion}`);
   await page.close();
  }
 }
 const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
 await page.goto('http://127.0.0.1:8799/');
 if (!(await page.locator('.resources a[href^="https:"]').count())) throw Error('No-JavaScript resource navigation missing');
 await page.close();
 await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
