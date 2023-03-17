const puppeteer = require("puppeteer");
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const fs = require("fs");
const mongoose = require("mongoose");

const EmpireSchema = require("./models/Empire");
const PORT = process.env.PORT || 3000;

//connect to db
mongoose.connect(process.env.DB_URI || require("./config/config").db.uri);

const connection = mongoose.connection;

connection.once("open", () => {
  console.log("MongoDB database connected");
});

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  try {
    const latestLogs = await EmpireSchema.find().limit(120);
    res.render("index", { logs: latestLogs });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving logs from database");
  }
});

async function crawler() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto("https://csgoempire.com/", { timeout: 60000 });
    await page.waitForSelector(".bet-btn--win", { timeout: 60000 });
  } catch (err) {
    console.log("Error waiting for selector:", err);
  }

  const divContainingClass = await page.waitForSelector(".bet-btn--win");
  const divContent = await page.evaluate(
    (div) => div.innerHTML,
    divContainingClass
  );

  const now = new Date();
  const timestamp = now.toLocaleString().replace(", ", "@");

  let msgType = "";

  if (divContent.includes('alt="t"')) {
    console.log(timestamp, "coin-t");
    io.emit("log", `coin-t`);
    msgType = "coin-t";
  } else if (divContent.includes('alt="ct"')) {
    console.log(timestamp, "coin-ct");
    io.emit("log", `coin-ct`);
    msgType = "coin-ct";
  } else if (divContent.includes('alt="bonus"')) {
    console.log(timestamp, "coin-bonus");
    io.emit("log", `coin-bonus`);
    msgType = "coin-bonus";
  }

  // save to database
  const empire = new EmpireSchema({timestamp: timestamp, coin: msgType});
  empire.save()
    .then(() => {
      console.log("Log saved to database");
    })
    .catch((err) => {
      console.error("Error saving log to database:", err);
    });

  await browser.close();
}

async function loop() {
  io.on("connection", (socket) => {
    let clientIp = socket.request.connection.remoteAddress.replace(
      "::ffff:",
      ""
    );
    console.log("client connected:", clientIp);
  });
  

  while (true) {
    await crawler();
    await delay(1000); // delay for 1 second before next iteration
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

loop();

http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
