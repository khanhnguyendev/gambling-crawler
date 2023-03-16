const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  fs.readFile(__dirname + '/data/logs.json', 'utf8', (err, data) => {
    if (err) throw err;

    // Parse the JSON data into an array of objects
    const logs = JSON.parse(data);

    // Get 120 latest objects
    const latestLogs = logs.slice(0, 120);

    res.render("index", {logs: latestLogs});
  })
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
  const timestamp = now.toLocaleString().replace(', ', '@');

  let msgType = '';

  if (divContent.includes('alt="t"')) {
    console.log(timestamp, 'coin-t');
    io.emit('log', `coin-t`);
    msgType = 'coin-t';
  } else if (divContent.includes('alt="ct"')) {
    console.log(timestamp, 'coin-ct');
    io.emit('log', `coin-ct`);
    msgType = 'coin-ct';
  } else if (divContent.includes('alt="bonus"')) {
    console.log(timestamp, 'coin-bonus');
    io.emit('log', `coin-bonus`);
    msgType = 'coin-bonus';
  }

  // Write the log to file
  const logsFilePath = __dirname + '/data/logs.json';

  try {
    const logsContent = await fs.promises.readFile(logsFilePath, 'utf8');
    const logs = JSON.parse(logsContent);
    logs.unshift({ timestamp, coin: msgType });
    await fs.promises.writeFile(logsFilePath, JSON.stringify(logs));
  } catch (err) {
    console.error('Error writing log to file:', err);
  }

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
