const puppeteer = require('puppeteer');
const express = require('express'); // <-- add this line
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

async function crawler() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  // const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('https://csgoempire.com/');

  const divContainingClass = await page.waitForSelector('.bet-btn--win');
  const divContent = await page.evaluate(div => div.innerHTML, divContainingClass);
  
  const now = new Date();
  const timestamp = now.toLocaleString();

  if (divContent.includes('alt="t"')) {
    console.log(timestamp, 'coin-t');
    io.emit('log', `T`);
  } else if (divContent.includes('alt="ct"')) {
    console.log(timestamp, 'coin-ct');
    io.emit('log', `CT`);
  } else if (divContent.includes('alt="bonus"')) {
    console.log(timestamp, 'coin-bonus');
    io.emit('log', `Bonus`);
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

io.on('connection', (socket) => {
  console.log('client connected');
});

http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
