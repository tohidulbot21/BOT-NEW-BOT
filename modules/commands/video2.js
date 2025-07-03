const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "video2",
  version: "2.0.0",
  permission: 0,
  credits: "TOHI-BOT-HUB",
  description: "YouTube ভিডিও সার্চ ও ডাউনলোড (25MB limit)",
  usePrefix: false,
  aliases: [],
  commandCategory: "media",
  usages: "video [কিওয়ার্ড বা ইউটিউব লিংক]",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": ""
  }
};

const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

async function getApiKey() {
  // keyVideo array থেকে একটী API_KEY র‍্যান্ডমলি আনো
  const res = await axios.get("https://raw.githubusercontent.com/quyenkaneki/data/main/video.json");
  const arr = res.data.keyVideo;
  return arr[Math.floor(Math.random() * arr.length)].API_KEY;
}

function cleanCacheImages() {
  for (let i = 1; i <= 12; i++) {
    const imgPath = path.join(cacheDir, `${i}.png`);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }
}

module.exports.run = async function({ api, event, args }) {
  if (!args[0]) {
    return api.sendMessage("❌ দয়া করে ইউটিউব ভিডিও লিংক বা গান/ভিডিওর নাম লিখুন!", event.threadID, event.messageID);
  }

  const input = args.join(" ");
  const isYoutubeLink = input.startsWith("https://");
  const apiKey = await getApiKey();

  // ইউটিউব লিংক হলে সরাসরি ডাউনলোড
  if (isYoutubeLink) {
    try {
      const videoId = input.split(/^.*(youtu.be\/|v\/|embed\/|watch\?|youtube.com\/user\/[^#]*#([^\/]*?\/)*)\??v?=?([^#\&\?]*).*/)[3];
      const res = await axios.get("https://ytstream-download-youtube-videos.p.rapidapi.com/dl", {
        params: { id: videoId },
        headers: {
          "x-rapidapi-host": "ytstream-download-youtube-videos.p.rapidapi.com",
          "x-rapidapi-key": apiKey
        }
      });
      const data = res.data;
      if (data.status === "fail" || !data.link) {
        return api.sendMessage("❌ ভিডিও ডাউনলোড করা যাচ্ছে না!", event.threadID, event.messageID);
      }
      const qualityKey = Object.keys(data.link)[1] || Object.keys(data.link)[0];
      const downloadUrl = data.link[qualityKey][0];
      const filePath = path.join(cacheDir, "video.mp4");

      const fileBuffer = (await axios.get(downloadUrl, { responseType: "arraybuffer" })).data;
      fs.writeFileSync(filePath, Buffer.from(fileBuffer, "utf-8"));

      if (fs.statSync(filePath).size > 25 * 1024 * 1024) {
        fs.unlinkSync(filePath);
        return api.sendMessage("❌ ফাইল 25MB এর বেশি, পাঠানো যাবে না!", event.threadID, event.messageID);
      }

      api.sendMessage({
        body: `✅ ${data.title}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => fs.unlinkSync(filePath), event.messageID);

    } catch (err) {
      return api.sendMessage("❌ ভিডিও ডাউনলোডে সমস্যা হয়েছে!", event.threadID, event.messageID);
    }
    return;
  }

  // সার্চ কিওয়ার্ড হলে: ইউটিউব সার্চ লিস্ট
  try {
    const youtubeApiKeys = [
      "AIzaSyB5A3Lum6u5p2Ki2btkGdzvEqtZ8KNLeXo",
      "AIzaSyAyjwkjc0w61LpOErHY_vFo6Di5LEyfLK0",
      "AIzaSyBY5jfFyaTNtiTSBNCvmyJKpMIGlpCSB4w",
      "AIzaSyCYCg9qpFmJJsEcr61ZLV5KsmgT1RE5aI4"
    ];
    const YT_KEY = youtubeApiKeys[Math.floor(Math.random() * youtubeApiKeys.length)];
    const youtubeSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(input)}&key=${YT_KEY}`;
    const searchRes = await axios.get(youtubeSearchUrl);

    if (!searchRes.data.items.length) {
      return api.sendMessage("❌ কোনো ভিডিও খুঁজে পাওয়া যায়নি!", event.threadID, event.messageID);
    }

    let body = "";
    let videoIds = [];
    let imgStreams = [];
    let idx = 1;

    for (const item of searchRes.data.items) {
      const vid = item.id.videoId;
      videoIds.push(vid);

      // Get Video Duration
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${vid}&key=${YT_KEY}`;
      const detailsRes = await axios.get(detailsUrl);
      let duration = "??:??";
      if (detailsRes.data.items && detailsRes.data.items[0]) {
        let dur = detailsRes.data.items[0].contentDetails.duration.replace("PT", "");
        dur = dur.replace("H", ":").replace("M", ":").replace("S", "");
        duration = dur;
      }

      // Download Thumbnail
      const thumbUrl = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
      const imgPath = path.join(cacheDir, `${idx}.png`);
      const imgBuffer = (await axios.get(thumbUrl, { responseType: "arraybuffer" })).data;
      fs.writeFileSync(imgPath, Buffer.from(imgBuffer, "utf-8"));
      imgStreams.push(fs.createReadStream(imgPath));

      // Add to body
      const nums = ["⓵", "⓶", "⓷", "⓸", "⓹", "⓺", "➐", "➑", "➒", "❿", "⓫", "⓬"];
      body += `${nums[idx - 1] || idx}. [${duration}] ${item.snippet.title}\n\n`;
      idx++;
    }

    body = `🔎 আপনার কিওয়ার্ড "${input}"-এর জন্য ${videoIds.length}টি ভিডিও পাওয়া গেছে:\n\n${body}\n\n» রিপ্লাই করুন (নাম্বার লিখে) — যেটি ডাউনলোড করতে চান!`;

    api.sendMessage(
      { attachment: imgStreams, body },
      event.threadID,
      (err, info) => {
        global.client.handleReply.push({
          name: module.exports.config.name,
          messageID: info.messageID,
          author: event.senderID,
          link: videoIds
        });
      },
      event.messageID
    );
  } catch (err) {
    return api.sendMessage("❌ সার্চে কোনো সমস্যা হয়েছে!", event.threadID, event.messageID);
  }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
  const idx = parseInt(event.body);
  if (isNaN(idx) || idx < 1 || idx > handleReply.link.length) {
    return api.sendMessage("❌ ১ থেকে ১২ এর মধ্যে নাম্বার দিন!", event.threadID, event.messageID);
  }
  const apiKey = await getApiKey();
  try {
    api.unsendMessage(handleReply.messageID);

    const videoId = handleReply.link[idx - 1];
    const res = await axios.get("https://ytstream-download-youtube-videos.p.rapidapi.com/dl", {
      params: { id: videoId },
      headers: {
        "x-rapidapi-host": "ytstream-download-youtube-videos.p.rapidapi.com",
        "x-rapidapi-key": apiKey
      }
    });
    const data = res.data;
    if (data.status === "fail" || !data.link) {
      cleanCacheImages();
      return api.sendMessage("❌ ভিডিও ডাউনলোড করা যাচ্ছে না!", event.threadID, event.messageID);
    }
    const qualityKey = Object.keys(data.link)[1] || Object.keys(data.link)[0];
    const downloadUrl = data.link[qualityKey][0];
    const filePath = path.join(cacheDir, "video.mp4");

    const fileBuffer = (await axios.get(downloadUrl, { responseType: "arraybuffer" })).data;
    fs.writeFileSync(filePath, Buffer.from(fileBuffer, "utf-8"));

    if (fs.statSync(filePath).size > 25 * 1024 * 1024) {
      fs.unlinkSync(filePath);
      cleanCacheImages();
      return api.sendMessage("❌ ফাইল 25MB এর বেশি, পাঠানো যাবে না!", event.threadID, event.messageID);
    }

    api.sendMessage({
      body: `✅ ${data.title}`,
      attachment: fs.createReadStream(filePath)
    }, event.threadID, () => {
      fs.unlinkSync(filePath);
      cleanCacheImages();
    }, event.messageID);

  } catch (err) {
    cleanCacheImages();
    return api.sendMessage("❌ ভিডিও ডাউনলোডে সমস্যা হয়েছে!", event.threadID, event.messageID);
  }
  cleanCacheImages();
};