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
  // const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.waitForSelector('.bet-btn--win', { timeout: 40000 });
  } catch (err) {
    console.log('Error waiting for selector:', err);
  }

  await page.goto('https://csgoempire.com/');

  const divContainingClass = await page.waitForSelector('.bet-btn--win');
  const divContent = await page.evaluate(div => div.innerHTML, divContainingClass);
  
  const now = new Date();
  const timestamp = now.toLocaleString();

  let lastBonus = 0;

  if (divContent.includes('alt="t"')) {
    console.log(timestamp, 'coin-t');
    lastBonus += 1;
    io.emit('log', `T`);
  } else if (divContent.includes('alt="ct"')) {
    console.log(timestamp, 'coin-ct');
    lastBonus += 1;
    io.emit('log', `CT`);
  } else if (divContent.includes('alt="bonus"')) {
    console.log(timestamp, 'coin-bonus');
    lastBonus = 0;
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
