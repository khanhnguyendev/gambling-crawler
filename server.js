const puppeteer = require("puppeteer");
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const config = require("./config/config");
const fs = require("fs");
const mongoose = require("mongoose");
const axios = require("axios");

const EmpireSchema = require("./models/Empire");
const PORT = process.env.PORT || 3000;

const botToken = process.env.BOT_TOKEN || config.bot.token;
const chatId = process.env.CHAT_ID || config.bot.chatId;
let lastBonus = 0;

//connect to db
mongoose.connect(process.env.DB_URI || config.db.uri);

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
    let totalsBonus = 0;
    let totalsT = 0;
    let totalsCT = 0;

    // Get the total count of logs in the database
    const endIndex = await EmpireSchema.countDocuments();
    let startIndex = 0;
    if (endIndex > 120) {
      startIndex = endIndex - 120;
    }

    const latestLogs = await EmpireSchema.find()
      .skip(startIndex)
      .limit(endIndex);

    latestLogs.forEach((log) => {
      if (log._doc.coin == "coin-t") {
        totalsT += 1;
      }
      if (log._doc.coin == "coin-ct") {
        totalsCT += 1;
      }
      if (log._doc.coin == "coin-bonus") {
        totalsBonus += 1;
      }
    });

    res.render("index", {
      logs: latestLogs,
      totalsT: totalsT,
      totalsCT: totalsCT,
      totalsBonus: totalsBonus,
    });
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

    // Set the countdown time to 30 seconds
    let countdown = 30;

    // Create an interval that decrements the countdown every second
    const interval = setInterval(async () => {
      countdown--;
      console.log(`Waiting... ${countdown}`)
      if (countdown === 0) {
        console.log(`Restarting server....`)
        // clear timer
        clearInterval(interval);

        let messsage = `Error waiting more than 30 second\nMissing result \nServer will automatically restart...`;
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
    lastBonus = 0;
    teleBOT(`DICEEEEEE!!!!!!!`);
  }

  // teltegram BOT
  if (lastBonus > 30) {
    teleBOT(`Đã ${lastBonus} cây chưa có DICE`);
  }

  // save to database
  const empire = new EmpireSchema({ timestamp: timestamp, coin: msgType });
  empire
    .save()
    .then(() => {
      console.log("Log saved to database");
    })
    .catch((err) => {
      teleBOT(`Saving result to database error...`);
      console.error("Saving result to database error: \n", err);
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

async function teleBOT(message) {
  await axios
    .post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: message,
    })
    .then((response) => {
      console.log("Message sent successfully");
    })
    .catch((error) => {
      console.error("Error sending message:", error);
    });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

loop();

http.listen(PORT, () => {
  teleBOT(`Server started...`);
  console.log(`Server listening on port ${PORT}`);
});
