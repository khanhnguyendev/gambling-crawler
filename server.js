const puppeteer = require("puppeteer");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const puppeteerConfig = require('./.puppeteerrc.cjs');
const EmpireSchema = require("./models/Empire");
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

const PORT = process.env.PORT || 3000;
const botToken = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
let lastBonus = 0;
let isCrawling = false; // Locking mechanism

async function startServer() {
  await mongoose.connect(process.env.DB_URI);
  console.log("Connected to MongoDB database");

  app.use(express.static(__dirname + "/public"));
  app.use(express.urlencoded({ extended: true }));
  app.set("views", __dirname + "/views");
  app.set("view engine", "ejs");
  app.use(cors());

  app.get("/home", getHome);

  server.listen(PORT, () => {
    teleBOT(`Server started...`);
    console.log(`Server listening on port ${PORT}`);
    loop();
  });
}

async function getHome(req, res) {
  try {
    const [latestLogs, { totalsT, totalsCT, totalsBonus }] = await processLogs();
    res.render("index", { logs: latestLogs, totalsT, totalsCT, totalsBonus });
  } catch (err) {
    console.error(err);
    teleBOT(err);
    res.status(500).send("Error retrieving logs from database");
  }
}

async function processLogs() {
  const endIndex = await EmpireSchema.countDocuments();
  const startIndex = endIndex > 150 ? endIndex - 150 : 0;
  const latestLogs = await EmpireSchema.find().skip(startIndex).limit(endIndex);

  let totalsT = 0;
  let totalsCT = 0;
  let totalsBonus = 0;

  latestLogs.forEach((log) => {
    if (log.coin === "coin-t") totalsT++;
    else if (log.coin === "coin-ct") totalsCT++;
    else if (log.coin === "coin-bonus") totalsBonus++;
  });

  return [latestLogs, { totalsT, totalsCT, totalsBonus }];
}

async function crawler() {
  if (isCrawling) {
    return; // Exit if crawling is already in progress
  }

  isCrawling = true; // Set the lock

  const browser = await puppeteer.launch({
    executablePath: puppeteerConfig.executablePath,
    args: [`--user-data-dir=${puppeteerConfig.cacheDirectory}`, '--no-sandbox'],
    headless: "new"
  });
  const page = await browser.newPage();

  try {
    await page.goto("https://csgoempire.com/", { timeout: 60000 });

    // Set the countdown time to 30 seconds
    let countdown = 30;

    // Create an interval that decrements the countdown every second
    const interval = setInterval(async () => {
      countdown--;
      console.log(`Waiting... ${countdown}`);
      if (countdown === 0) {
        console.log(`Restarting server...`);
        // clear timer
        clearInterval(interval);

        let messsage = `Error waiting more than 30 seconds\nServer will automatically restart...`;
        await teleBOT(messsage);

        const timestamp = new Date().toISOString();
        const logMsg = `${timestamp}: ${messsage}\n`;
        fs.appendFile("logs.json", logMsg, (err) => {
          if (err) {
            console.error("Failed to write to logs.txt:", err);
          }
        });
      }
    }, 1000);

    await page.waitForSelector(".bet-btn--win", { timeout: 60000 });

    // clear timer
    clearInterval(interval);
    // Clear the lock
    isCrawling = false;
  } catch (err) {
    console.log("Error:", err);
    teleBOT(err);
    // Clear the lock in case of error
    isCrawling = false;
  }

  const divContainingClass = await page.waitForSelector(".bet-btn--win");
  const divContent = await page.evaluate((div) => div.innerHTML, divContainingClass);

  const now = new Date();
  const timestamp = now.toLocaleString().replace(", ", "@");
  let msgType = "";

  if (divContent.includes('alt="t"')) {
    console.log(timestamp, "coin-t");
    io.emit("log", `coin-t`);
    msgType = "coin-t";
    lastBonus += 1;
  } else if (divContent.includes('alt="ct"')) {
    console.log(timestamp, "coin-ct");
    io.emit("log", `coin-ct`);
    msgType = "coin-ct";
    lastBonus += 1;
  } else if (divContent.includes('alt="bonus"')) {
    console.log(timestamp, "coin-bonus");
    io.emit("log", `coin-bonus`);
    msgType = "coin-bonus";
    teleBOT(`${lastBonus} ==> DICEEE!!!`);
    lastBonus = 0;
  }

  // Telegram BOT
  if (lastBonus > 25) {
    teleBOT(`${lastBonus} times without DICE`);
  }

  // Save to database
  await saveToDatabase(timestamp, msgType);

  await browser.close();
}

async function loop() {
  io.on("connection", (socket) => {
    const clientIp = socket.request.connection.remoteAddress.replace("::ffff:", "");
    console.log("Client connected:", clientIp);
  });

  while (true) {
    await crawler();
    await delay(1000); // Delay for 1 second before the next iteration
  }
}

async function saveToDatabase(timestamp, coinType) {
  try {
    const empire = new EmpireSchema({ timestamp, coin: coinType });
    await empire.save();
    console.log("Log saved to database");
  } catch (err) {
    teleBOT(`Saving result to database error...`);
    console.error("Saving result to database error: \n", err);
  }
}

async function teleBOT(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
    });
    console.log(`[Message sent successfully] => ${message}`);
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

startServer();
