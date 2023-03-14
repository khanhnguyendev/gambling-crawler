const puppeteer = require('puppeteer');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const wss = new WebSocket.Server({ port: 8080 });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

wss.on('connection', (ws) => {
  console.log('Client connected');

  async function crawler() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://csgoempire.com/');
    const divContainingClass = await page.waitForSelector('.previous-rolls-enter-active');
    const divContent = await page.evaluate(div => div.innerHTML, divContainingClass);
    const now = new Date();
    const timestamp = now.toLocaleString();

    if (divContent.includes('coin-t')) {
      const message = `${timestamp} - T`;
      console.log(message);
      ws.send(message);
    } else if (divContent.includes('coin-ct')) {
      const message = `${timestamp} - CT`;
      console.log(message);
      ws.send(message);
    } else if (divContent.includes('coin-bonus')) {
      const message = `${timestamp} - Bonus`;
      console.log(message);
      ws.send(message);
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
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
