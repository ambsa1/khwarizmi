// يجمّع لقطات wide2 في لوحات: node tests/wide2.sheet.js <prefix>   → tests/shots/wide2/_sheet-<prefix>-N.png
const path = require('path'), fs = require('fs');
const { chromium } = require(path.join(__dirname, 'node_modules', 'playwright'));
const DIR = path.join(__dirname, 'shots', 'wide2'), prefix = process.argv[2] || 'en-1366x768', per = +process.argv[3] || 9;
(async () => {
  const files = fs.readdirSync(DIR).filter(f => f.startsWith(prefix) && f.endsWith('.png') && !f.startsWith('_'));
  const br = await chromium.launch();
  for (let i = 0; i * per < files.length; i++) {
    const chunk = files.slice(i * per, (i + 1) * per);
    const pg = await br.newPage({ viewport: { width: 1500, height: 100 }, deviceScaleFactor: 1 });
    const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px">${chunk.map(f => `<figure style="margin:0;color:#fff;font:12px sans-serif"><img src="data:image/png;base64,${fs.readFileSync(path.join(DIR, f)).toString('base64')}" style="width:100%;display:block"><figcaption>${f}</figcaption></figure>`).join('')}</body>`;
    await pg.setContent(html); await pg.waitForTimeout(200);
    await pg.screenshot({ path: path.join(DIR, `_sheet-${prefix}-${i + 1}.png`), fullPage: true });
    await pg.close();
  }
  await br.close(); console.log('sheets:', Math.ceil(files.length / per));
})();
