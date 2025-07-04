const path = require('path');
const fs = require('fs');

// Add Canvas imports with fallback handling
let createCanvas, loadImage, Canvas;
try {
  Canvas = require('canvas');
  createCanvas = Canvas.createCanvas;
  loadImage = Canvas.loadImage;
  console.log('✅ Canvas loaded successfully for image generation');
} catch (error) {
  console.warn('⚠️ Canvas not available, image generation disabled:', error.message);
  createCanvas = null;
  loadImage = null;
  Canvas = null;
}

const cacheDir = path.join(__dirname, 'cache');
const rankpng = path.join(__dirname, 'cache', 'rankup');

if (!fs.existsSync(rankpng)) {
    fs.mkdirSync(rankpng, { recursive: true });
}

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir);
}

module.exports.config = {
  name: "rankup",
  version: "1.0.0",
  hasPermssion: 1,
  credits: "TOHI-BOT-HUB",
  description: "Announce rankup for each group, user",
  usePrefix: true,
  commandCategory: "Edit-IMG",
  dependencies: {
    "fs-extra": ""
  },
  cooldowns: 2,
};

module.exports.handleEvent = async function({
  api, event, Currencies, getText, Threads }) {
  var { threadID, senderID } = event;
  const fs = global.nodemodule["fs-extra"];
  const axios = global.nodemodule["axios"];
  let pathImg = __dirname + "/cache/rankup/rankup.png";
  let pathAvt1 = __dirname + "/cache/Avtmot.png";
  var id1 = event.senderID;

  threadID = String(threadID);
  senderID = String(senderID);

  const thread = global.data.threadData.get(threadID) || {};

  let userData;
  try {
    userData = await Currencies.getData(senderID);
  } catch (error) {
    console.log(`Error getting currency data for ${senderID}: ${error.message}`);
    return;
  }

  if (!userData) {
    console.log(`No user data found for ${senderID}`);
    return;
  }

  let exp = userData.exp || 0;
  exp = exp += 1;

  if (isNaN(exp)) return;

  if (typeof thread["rankup"] != "undefined" && thread["rankup"] == false) {
    await Currencies.setData(senderID, {
      exp
    });
    return;
  };

  const curLevel = Math.floor((Math.sqrt(1 + (4 * exp / 3) + 1) / 2));
  const level = Math.floor((Math.sqrt(1 + (4 * (exp + 1) / 3) + 1) / 2));

  if (level > curLevel && level != 1) {
    let name;
  try {
    const getName = await api.getUserInfo(id1);
    name = getName[id1]?.name || `User-${id1.slice(-6)}`;
  } catch (error) {
    name = `User-${id1.slice(-6)}`;
  }
    // Get levelup message with proper fallback
    let messsage;
    try {
      if (typeof thread.customRankup !== "undefined") {
        messsage = thread.customRankup;
      } else if (typeof getText === 'function') {
        messsage = getText("levelup");
      } else {
        // Use module's own language config as fallback
        const lang = global.config.language || "en";
        const langData = module.exports.languages[lang] || module.exports.languages["en"];
        messsage = langData.levelup || "Congratulations {name}, being talkative helped you level up to level {level}!";
      }
    } catch (error) {
      // Final fallback if everything fails
      messsage = "Congratulations {name}, being talkative helped you level up to level {level}!";
    }

    messsage = messsage
      .replace(/\{name}/g, name)
      .replace(/\{level}/g, level);

    var background = [
      "https://i.ibb.co/7xrf2Px8/rankup.png",
      "https://i.ibb.co/JFFDjqFk/rankup.png",
      "https://i.ibb.co/jZHb2st9/rankup.png"
    ];
    var rd = background[Math.floor(Math.random() * background.length)];
    let getAvtmot = (
      await axios.get(
        `https://graph.facebook.com/${id1}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, {
        responseType: "arraybuffer"
      }
      )
    )
      .data;
    fs.writeFileSync(pathAvt1, Buffer.from(getAvtmot, "utf-8"));

    let getbackground = (
      await axios.get(`${rd}`, {
        responseType: "arraybuffer"
        ,
      })
    )
      .data;
    fs.writeFileSync(pathImg, Buffer.from(getbackground, "utf-8"));

    // Check if Canvas is available
    if (!Canvas || !loadImage || !createCanvas) {
      // Clean up downloaded files
      if (fs.existsSync(pathAvt1)) fs.removeSync(pathAvt1);
      if (fs.existsSync(pathImg)) fs.removeSync(pathImg);
      
      // Send text-only message if Canvas is not available
      return api.sendMessage({
        body: messsage + "\n\n📝 Note: Image generation temporarily unavailable due to Canvas library issues",
        mentions: [{
          tag: name,
          id: senderID
        }]
      }, event.threadID, event.messageID);
    }

    try {
      let baseImage = await loadImage(pathImg);
      let baseAvt1 = await loadImage(pathAvt1);
      let canvas = createCanvas(baseImage.width, baseImage.height);
      let ctx = canvas.getContext("2d");
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      ctx.rotate(-25 * Math.PI / 180);
      ctx.drawImage(baseAvt1, 27.3, 103, 108, 108);
      const imageBuffer = canvas.toBuffer();
      fs.writeFileSync(pathImg, imageBuffer);
      fs.removeSync(pathAvt1);
      api.sendMessage({
        body: messsage,
        mentions: [{
          tag: name,
          id: senderID
        }],
        attachment: fs.createReadStream(pathImg)
      }, event.threadID, () => fs.unlinkSync(pathImg));
    } catch (canvasError) {
      // Fallback to text-only if Canvas operations fail
      console.log(`Canvas error in rankup: ${canvasError.message}`);
      fs.removeSync(pathAvt1);
      fs.removeSync(pathImg);
      return api.sendMessage({
        body: messsage + "\n\n📝 Note: Image generation failed, showing text only",
        mentions: [{
          tag: name,
          id: senderID
        }]
      }, event.threadID);
    }

  }

  await Currencies.setData(senderID, {
    exp
  });
  return;
}

module.exports.languages = {
  "en": {
    "on": "on",
    "off": "off", 
    "successText": "success notification rankup!",
    "levelup": "Congratulations {name}, being talkative helped you level up to level {level}!"
  },
  "vi": {
    "on": "bật",
    "off": "tắt",
    "successText": "thành công thông báo rankup!",
    "levelup": "Chúc mừng {name}, việc nói chuyện nhiều đã giúp bạn lên cấp độ {level}!"
  },
  "bd": {
    "on": "চালু",
    "off": "বন্ধ",
    "successText": "র‍্যাঙ্কআপ বিজ্ঞপ্তি সফল!",
    "levelup": "অভিনন্দন {name}, কথোপকথন আপনাকে লেভেল {level} এ উন্নীত করেছে!"
  }
}

module.exports.run = async function({ api, event, Threads, getText }) {
  const {
    threadID
    , messageID
  } = event;
  let data = (await Threads.getData(threadID))
    .data;

  if (typeof data["rankup"] == "undefined" || data["rankup"] == false) data["rankup"] = true;
  else data["rankup"] = false;

  await Threads.setData(threadID, {
    data
  });
  global.data.threadData.set(threadID, data);
  return api.sendMessage(`${(data["rankup"] == true) ? getText("on") : getText("off")} ${getText("successText")}`, threadID, messageID);
}