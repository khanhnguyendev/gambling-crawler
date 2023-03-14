const puppeteer = require('puppeteer');

async function crawler() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('https://csgoempire.com/');

  const divContainingClass = await page.waitForSelector('.previous-rolls-enter-active');
  const divContent = await page.evaluate(div => div.innerHTML, divContainingClass);
  
  const now = new Date();
  const timestamp = now.toLocaleString();

  if (divContent.includes('coin-t')) {
    console.log(`${timestamp} - T`);
  } else if (divContent.includes('coin-ct')) {
    console.log(`${timestamp} - CT`);
  } else if (divContent.includes('coin-bonus')) {
    console.log(`${timestamp} - Bonus`);
  }

  await browser.close();
}

async function loop() {
  while (true) {
    await crawler();
    await delay(3000); // delay for 3 seconds before next iteration
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

loop();