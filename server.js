const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

async function crawler() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto('https://csgoempire.com/', { timeout: 60000 });
    await page.waitForSelector('.bet-btn--win', { timeout: 60000 });
  } catch (err) {
    console.log('Error waiting for selector:', err);
  }

  const divContainingClass = await page.waitForSelector('.bet-btn--win');
  const divContent = await page.evaluate(div => div.innerHTML, divContainingClass);

  const now = new Date();
  const timestamp = now.toLocaleString();

  let msgType = '';

  if (divContent.includes('alt="t"')) {
    console.log(timestamp, 'coin-t');
    io.emit('log', `T`);
    msgType = 'T';
  } else if (divContent.includes('alt="ct"')) {
    console.log(timestamp, 'coin-ct');
    io.emit('log', `CT`);
    msgType = 'CT';
  } else if (divContent.includes('alt="bonus"')) {
    console.log(timestamp, 'coin-bonus');
    io.emit('log', `Bonus`);
    msgType = 'Bonus';
  }

  // Write the log to file
  const logLine = `${timestamp},${msgType}\n`;
  fs.appendFile(__dirname + '/data/logs.txt', logLine, (err) => {
    if (err) throw err;
  });

  await browser.close();
}

async function loop() {
  io.on('connection', (socket) => {
    console.log('client connected');
  });

  while (true) {
    await crawler();
    await delay(1000); // delay for 1 second before next iteration
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

loop();

http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
