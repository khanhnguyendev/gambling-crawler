const puppeteer = require('puppeteer');
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

async function crawler() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('https://csgoempire.com/');

  const divContainingClass = await page.waitForSelector('.previous-rolls-enter-active');
  const divContent = await page.evaluate(div => div.innerHTML, divContainingClass);
  
  const now = new Date();
  const timestamp = now.toLocaleString();

  if (divContent.includes('coin-t')) {
    console.log(timestamp, 'coin-t');
    io.emit('log', `${timestamp} - T`);
  } else if (divContent.includes('coin-ct')) {
    console.log(timestamp, 'coin-ct');
    io.emit('log', `${timestamp} - CT`);
  } else if (divContent.includes('coin-bonus')) {
    console.log(timestamp, 'coin-bonus');
    io.emit('log', `${timestamp} - Bonus`);
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
