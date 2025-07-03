const fs = require("fs-extra");
const path = require("path");
const ytdl = require("@distube/ytdl-core");
const ytSearch = require("yt-search");
const { exec } = require("child_process");

module.exports.config = {
  name: "ytmulti",
  version: "2.0.0",
  hasPermssion: 0,
  usePrefix: true,
  credits: "Made by TOHI-BOT-HUB",
  description: "⫸ TBH ➤ YouTube mp3/mp4 + unlink + স্টাইলিশ SMS (mp3/mp4/sing/video)",
  commandCategory: "media",
  usages: "/ytmulti mp3 গান\n/ytmulti mp4 গান\n/ytmulti sing গান\n/ytmulti video গান",
  cooldowns: 8,
  dependencies: {
    "@distube/ytdl-core": "",
    "yt-search": "",
    "fs-extra": "",
    "child_process": "",
    "ffmpeg-static": ""
  },
};

const cachePath = path.join(__dirname, "cache");
if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);

const TBH = "⫸ TBH ➤";

function fancy(text) {
  // স্টাইলিশ ফন্ট ও ইমোজি
  return `『✦⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯✦』\n${TBH}\n${text}\n『✦⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯✦』\n𝐂𝐫𝐞𝐝𝐢𝐭𝐬: 𝙈𝙖𝙙𝙚 𝙗𝙮 𝙏𝙊𝙃𝙄-𝘽𝙊𝙏-𝙃𝙐𝘽`;
}

module.exports.run = async function({ api, event, args }) {
  if (!args[0] || !["mp3", "mp4", "sing", "video"].includes(args[0].toLowerCase()))
    return api.sendMessage(
      fancy("⚠️ কমান্ড:\n/ytmulti mp3 গান\n/ytmulti mp4 গান\n/ytmulti sing গান\n/ytmulti video গান\n\n✦ উদাহরণ:\n/ytmulti mp3 purnota"),
      event.threadID, event.messageID);

  const type = args[0].toLowerCase();
  const query = args.slice(1).join(" ");
  if (!query) return api.sendMessage(fancy("⚠️ দয়া করে গান বা ভিডিওর নাম দিন!"), event.threadID, event.messageID);

  // sing হলে ডাইরেক্ট mp3 ডাউনলোড (search বা list ছাড়াই)
  if (type === "sing") {
    try {
      api.sendMessage(fancy(`🔎 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙤𝙣 𝙔𝙤𝙪𝙏𝙪𝙗𝙚: “${query}” 𝙋𝙡𝙚𝙖𝙨𝙚 𝙒𝙖𝙞𝙩...`), event.threadID, event.messageID);
      const res = await ytSearch(query);
      if (!res.videos.length) return api.sendMessage(fancy("❌ কিছুই খুঁজে পাওয়া যায়নি!"), event.threadID, event.messageID);
      const video = res.videos[0]; // Top 1
      const url = video.url;
      const safeTitle = video.title.replace(/[^\w\s]/gi, "").substring(0, 30) + "_" + event.senderID;
      const mp3Path = path.join(cachePath, `${safeTitle}.mp3`);

      api.sendMessage(fancy(`🎶 𝘿𝙤𝙬𝙣𝙡𝙤𝙖𝙙𝙞𝙣𝙜: “${video.title}”`), event.threadID, event.messageID);

      const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
      const ffmpegPath = require("ffmpeg-static");
      const ffmpegCmd = `${ffmpegPath} -y -i pipe:0 -vn -acodec libmp3lame -ab 192k "${mp3Path}"`;
      const ffmpeg = exec(ffmpegCmd);
      stream.pipe(ffmpeg.stdin);

      ffmpeg.on("close", () => {
        if (fs.statSync(mp3Path).size > 25 * 1024 * 1024) {
          fs.unlinkSync(mp3Path);
          return api.sendMessage(fancy("❌ ফাইল 25MB এর বেশি!"), event.threadID, event.messageID);
        }
        api.sendMessage({
          body: fancy(`🎧 𝙏𝙤𝙥 𝙂𝙖𝙣: ${video.title}`),
          attachment: fs.createReadStream(mp3Path)
        }, event.threadID, () => fs.unlinkSync(mp3Path), event.messageID);
      });
      ffmpeg.on("error", err =>
        api.sendMessage(fancy("❌ অডিও ডাউনলোডে সমস্যা:\n" + err), event.threadID, event.messageID)
      );
    } catch (err) {
      api.sendMessage(fancy("❌ অডিও ডাউনলোডে সমস্যা:\n" + err), event.threadID, event.messageID);
    }
    return;
  }

  // video হলে ডাইরেক্ট mp4 ডাউনলোড (search বা list ছাড়াই)
  if (type === "video") {
    try {
      api.sendMessage(fancy(`🔎 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙤𝙣 𝙔𝙤𝙪𝙏𝙪𝙗𝙚: “${query}” 𝙋𝙡𝙚𝙖𝙨𝙚 𝙒𝙖𝙞𝙩...`), event.threadID, event.messageID);
      const res = await ytSearch(query);
      if (!res.videos.length) return api.sendMessage(fancy("❌ কিছুই খুঁজে পাওয়া যায়নি!"), event.threadID, event.messageID);
      const video = res.videos[0]; // Top 1
      const url = video.url;
      const safeTitle = video.title.replace(/[^\w\s]/gi, "").substring(0, 30) + "_" + event.senderID;
      const mp4Path = path.join(cachePath, `${safeTitle}.mp4`);

      api.sendMessage(fancy(`🎬 𝘿𝙤𝙬𝙣𝙡𝙤𝙖𝙙𝙞𝙣𝙜 𝙫𝙞𝙙𝙚𝙤: “${video.title}”`), event.threadID, event.messageID);

      // Proper muxed download (video+audio, best quality <=25MB)
      const stream = ytdl(url, { quality: "highest", filter: "audioandvideo" });
      const ffmpegPath = require("ffmpeg-static");
      const ffmpegCmd = `${ffmpegPath} -y -i pipe:0 -c:v copy -c:a libmp3lame -ab 192k "${mp4Path}"`;
      const ffmpeg = exec(ffmpegCmd);
      stream.pipe(ffmpeg.stdin);

      ffmpeg.on("close", () => {
        if (!fs.existsSync(mp4Path)) {
          return api.sendMessage(fancy("❌ ভিডিও রেন্ডার হয়নি!"), event.threadID, event.messageID);
        }
        if (fs.statSync(mp4Path).size > 25 * 1024 * 1024) {
          fs.unlinkSync(mp4Path);
          return api.sendMessage(fancy("❌ ফাইল 25MB এর বেশি!"), event.threadID, event.messageID);
        }
        api.sendMessage({
          body: fancy(`🎬 𝙏𝙤𝙥 𝙑𝙞𝙙𝙚𝙤: ${video.title}`),
          attachment: fs.createReadStream(mp4Path)
        }, event.threadID, () => fs.unlinkSync(mp4Path), event.messageID);
      });
      ffmpeg.on("error", err =>
        api.sendMessage(fancy("❌ ভিডিও ডাউনলোডে সমস্যা:\n" + err), event.threadID, event.messageID)
      );
    } catch (err) {
      api.sendMessage(fancy("❌ ভিডিও ডাউনলোডে সমস্যা:\n" + err), event.threadID, event.messageID);
    }
    return;
  }

  // mp3/mp4: লিস্ট আসবে, reply-তে number দিলে সেই গান/ভিডিও আসবে
  api.sendMessage(fancy(`🔎 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙏𝙤𝙥 5 𝙍𝙚𝙨𝙪𝙡𝙩𝙨: “${query}”`), event.threadID, event.messageID);
  try {
    const res = await ytSearch(query);
    if (!res.videos.length) return api.sendMessage(fancy("❌ কিছুই খুঁজে পাওয়া যায়নি!"), event.threadID, event.messageID);
    const results = res.videos.slice(0, 5);

    let msg = `『✦ 𝙏𝙊𝙋 𝟓 𝙎𝙚𝙖𝙧𝙘𝙝 𝙍𝙚𝙨𝙪𝙡𝙩𝙨 ✦』\n`;
    results.forEach((v, i) => {
      msg += `\n${i + 1}. 🎵 𝙉𝙖𝙢𝙚: ${v.title}\n⏰ 𝙏𝙞𝙢𝙚: ${v.timestamp}\n🔗 𝙇𝙞𝙣𝙠: ${v.url}\n`;
    });
    msg += `\n⫸ TBH ➤ Reply দিয়ে ১-৫ নাম্বার দিন, 𝙨𝙤𝙣𝙜/𝙫𝙞𝙙𝙚𝙤 ${type} ফরম্যাটে ডাউনলোড হবে!\n𝐂𝐫𝐞𝐝𝐢𝐭𝐬: 𝙈𝙖𝙙𝙚 𝙗𝙮 𝙏𝙊𝙃𝙄-𝘽𝙊𝙏-𝙃𝙐𝘽`;

    api.sendMessage(msg, event.threadID, (err, info) => {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        author: event.senderID,
        type,
        results
      });
    }, event.messageID);
  } catch (e) {
    api.sendMessage(fancy("❌ সমস্যা হয়েছে:\n" + e), event.threadID, event.messageID);
  }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
  const selection = parseInt(event.body.trim());
  if (isNaN(selection) || selection < 1 || selection > handleReply.results.length)
    return api.sendMessage(fancy(`❌ Valid নাম্বার দিন (1-${handleReply.results.length})`), event.threadID, event.messageID);

  const video = handleReply.results[selection - 1];
  const url = video.url;
  const safeTitle = video.title.replace(/[^\w\s]/gi, "").substring(0, 30) + "_" + event.senderID;
  api.sendMessage(fancy(`⏬ 𝘿𝙤𝙬𝙣𝙡𝙤𝙖𝙙 𝙨𝙩𝙖𝙧𝙩𝙞𝙣𝙜: ${video.title}`), event.threadID, event.messageID);

  if (["mp3"].includes(handleReply.type)) {
    // MP3 Download
    const mp3Path = path.join(cachePath, `${safeTitle}.mp3`);
    try {
      const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
      const ffmpegPath = require("ffmpeg-static");
      const ffmpegCmd = `${ffmpegPath} -y -i pipe:0 -vn -acodec libmp3lame -ab 192k "${mp3Path}"`;
      const ffmpeg = exec(ffmpegCmd);
      stream.pipe(ffmpeg.stdin);

      ffmpeg.on("close", () => {
        if (fs.statSync(mp3Path).size > 25 * 1024 * 1024) {
          fs.unlinkSync(mp3Path);
          return api.sendMessage(fancy("❌ ফাইল 25MB এর বেশি, পাঠানো যাবে না!"), event.threadID, event.messageID);
        }
        api.sendMessage({
          body: fancy(`🎧 𝙂𝙖𝙣: ${video.title}`),
          attachment: fs.createReadStream(mp3Path)
        }, event.threadID, () => fs.unlinkSync(mp3Path), event.messageID);
      });
      ffmpeg.on("error", err =>
        api.sendMessage(fancy("❌ অডিও ডাউনলোডে সমস্যা:\n" + err), event.threadID, event.messageID)
      );
    } catch (err) {
      api.sendMessage(fancy("❌ অডিও ডাউনলোডে সমস্যা:\n" + err), event.threadID, event.messageID);
    }
  } else if (["mp4"].includes(handleReply.type)) {
    // MP4 Download (muxed, with audio)
    const mp4Path = path.join(cachePath, `${safeTitle}.mp4`);
    try {
      const stream = ytdl(url, { quality: "highest", filter: "audioandvideo" });
      const ffmpegPath = require("ffmpeg-static");
      const ffmpegCmd = `${ffmpegPath} -y -i pipe:0 -c:v copy -c:a libmp3lame -ab 192k "${mp4Path}"`;
      const ffmpeg = exec(ffmpegCmd);
      stream.pipe(ffmpeg.stdin);

      ffmpeg.on("close", () => {
        if (!fs.existsSync(mp4Path)) {
          return api.sendMessage(fancy("❌ ভিডিও রেন্ডার হয়নি!"), event.threadID, event.messageID);
        }
        if (fs.statSync(mp4Path).size > 25 * 1024 * 1024) {
          fs.unlinkSync(mp4Path);
          return api.sendMessage(fancy("❌ ফাইল 25MB এর বেশি, পাঠানো যাবে না!"), event.threadID, event.messageID);
        }
        api.sendMessage({
          body: fancy(`🎬 𝙑𝙞𝙙𝙚𝙤: ${video.title}`),
          attachment: fs.createReadStream(mp4Path)
        }, event.threadID, () => fs.unlinkSync(mp4Path), event.messageID);
      });
      ffmpeg.on("error", err =>
        api.sendMessage(fancy("❌ ভিডিও ডাউনলোডে সমস্যা:\n" + err), event.threadID, event.messageID)
      );
    } catch (err) {
      api.sendMessage(fancy("❌ ভিডিও ডাউনলোডে সমস্যা:\n" + err), event.threadID, event.messageID);
    }
  }
};