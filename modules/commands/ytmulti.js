const fs = require("fs-extra");
const path = require("path");
const ytdl = require("@distube/ytdl-core");
const ytSearch = require("yt-search");
const { exec } = require("child_process");

module.exports.config = {
  name: "yt",
  version: "2.2.0",
  hasPermssion: 0,
  usePrefix: true,
  aliases: ["mp3", "mp4", "video", "ytmp3", "ytvideo"], // aliases is now just after usePrefix
  credits: "Made by TOHI-BOT-HUB",
  description: "⫸ TBH ➤ YouTube mp3/mp4 + unlink + স্টাইলিশ SMS (mp3/mp4/video/ytmp3/ytvideo)",
  commandCategory: "media",
  usages: "yt mp3/mp4/video/ytmp3/ytvideo গান\n...",
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
  return `『✦⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯✦』\n${TBH}\n${text}\n『✦⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯✦』\n𝐂𝐫𝐞𝐝𝐢𝐭𝐬: 𝙈𝙖𝙙𝙚 𝙗𝙮 𝙏𝙊𝙃𝙄-𝘽𝙊𝙏-𝙃𝙐𝘽`;
}

module.exports.run = async function({ api, event, args, commandName }) {
  let type = "";
  let query = "";
  const calledAs = (commandName || module.exports.config.name).toLowerCase();

  // Alias mapping
  if (["ytmp3", "mp3"].includes(calledAs)) {
    type = "mp3";
    query = args.join(" ");
  } else if (["ytvideo", "video"].includes(calledAs)) {
    type = "mp4";
    query = args.join(" ");
  } else if (
    ["yt"].includes(calledAs) &&
    args[0] &&
    ["mp3", "mp4", "video", "ytmp3", "ytvideo"].includes(args[0].toLowerCase())
  ) {
    let subcmd = args[0].toLowerCase();
    if (["ytmp3", "mp3"].includes(subcmd)) type = "mp3";
    else if (["ytvideo", "mp4", "video"].includes(subcmd)) type = "mp4";
    query = args.slice(1).join(" ");
  } else if (["mp3", "mp4", "video", "ytmp3", "ytvideo"].includes(args[0]?.toLowerCase())) {
    let subcmd = args[0].toLowerCase();
    if (["ytmp3", "mp3"].includes(subcmd)) type = "mp3";
    else if (["ytvideo", "mp4", "video"].includes(subcmd)) type = "mp4";
    query = args.slice(1).join(" ");
  }

  // যদি type না মিলে, বা গান না থাকে, হেল্প দেখাও
  if (!type || !["mp3", "mp4"].includes(type)) {
    return api.sendMessage(
      fancy(
        "⚠️ কমান্ড:\n/mp3 গান\n/video গান\n/ytmp3 গান\n/ytvideo গান\n/yt mp3 গান\n/yt video গান\n\n✦ উদাহরণ:\n/mp3 purnota\n/ytvideo valo achi"
      ),
      event.threadID,
      event.messageID
    );
  }
  if (!query)
    return api.sendMessage(
      fancy("⚠️ দয়া করে গান বা ভিডিওর নাম দিন!"),
      event.threadID,
      event.messageID
    );

  // MP3 DOWNLOAD
  if (type === "mp3") {
    let searchingMsgID = null, downloadingMsgID = null;
    try {
      await new Promise((res) => {
        api.sendMessage(
          fancy(`🔎 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙤𝙣 𝙔𝙤𝙪𝙏𝙪𝙗𝙚: “${query}” 𝙋𝙡𝙚𝙖𝙨𝙚 𝙒𝙖𝙞𝙩...`),
          event.threadID,
          (err, info) => { searchingMsgID = info?.messageID; res(); },
          event.messageID
        );
      });

      const res = await ytSearch(query);
      if (!res.videos.length) {
        if (searchingMsgID) api.unsendMessage(searchingMsgID);
        return api.sendMessage(
          fancy("❌ কিছুই খুঁজে পাওয়া যায়নি!"),
          event.threadID,
          event.messageID
        );
      }
      const video = res.videos[0];
      const url = video.url;
      const safeTitle =
        video.title.replace(/[^\w\s]/gi, "").substring(0, 30) +
        "_" +
        event.senderID;
      const mp3Path = path.join(cachePath, `${safeTitle}.mp3`);

      if (searchingMsgID) await api.unsendMessage(searchingMsgID);
      await new Promise((res2) => {
        api.sendMessage(
          fancy(`🎶 𝘿𝙤𝙬𝙣𝙡𝙤𝙖𝙙𝙞𝙣𝙜: “${video.title}”`),
          event.threadID,
          (err, info) => { downloadingMsgID = info?.messageID; res2(); }
        );
      });

      const stream = ytdl(url, {
        filter: "audioonly",
        quality: "highestaudio",
      });
      const ffmpegPath = require("ffmpeg-static");
      const ffmpegCmd = `${ffmpegPath} -y -i pipe:0 -vn -acodec libmp3lame -ab 192k "${mp3Path}"`;
      const ffmpeg = exec(ffmpegCmd);
      stream.pipe(ffmpeg.stdin);

      ffmpeg.on("close", () => {
        if (downloadingMsgID) api.unsendMessage(downloadingMsgID);
        if (fs.statSync(mp3Path).size > 25 * 1024 * 1024) {
          fs.unlinkSync(mp3Path);
          return api.sendMessage(
            fancy("❌ ফাইল 25MB এর বেশি!"),
            event.threadID,
            event.messageID
          );
        }
        api.sendMessage(
          {
            body: fancy(`🎧 𝙏𝙤𝙥 𝙂𝙖𝙣: ${video.title}`),
            attachment: fs.createReadStream(mp3Path),
          },
          event.threadID,
          () => fs.unlinkSync(mp3Path),
          event.messageID
        );
      });
      ffmpeg.on("error", (err) =>
        api.sendMessage(
          fancy("❌ অডিও ডাউনলোডে সমস্যা:\n" + err),
          event.threadID,
          event.messageID
        )
      );
    } catch (err) {
      if (searchingMsgID) api.unsendMessage(searchingMsgID);
      if (downloadingMsgID) api.unsendMessage(downloadingMsgID);
      if (err && err.message && err.message.includes("Sign in to confirm you’re not a bot")) {
        api.sendMessage(fancy("❌ ইউটিউব এখন ডাউনলোড ব্লক করছে। দয়া করে কিছুক্ষণ পরে আবার চেষ্টা করুন বা বট মালিককে জানান।"), event.threadID, event.messageID);
      } else {
        api.sendMessage(
          fancy("❌ অডিও ডাউনলোডে সমস্যা:\n" + err),
          event.threadID,
          event.messageID
        );
      }
    }
    return;
  }

  // MP4 DOWNLOAD
  if (type === "mp4") {
    let searchingMsgID = null, downloadingMsgID = null;
    try {
      await new Promise((res) => {
        api.sendMessage(
          fancy(`🔎 𝙎𝙚𝙖𝙧𝙘𝙝𝙞𝙣𝙜 𝙤𝙣 𝙔𝙤𝙪𝙏𝙪𝙗𝙚: “${query}” 𝙋𝙡𝙚𝙖𝙨𝙚 𝙒𝙖𝙞𝙩...`),
          event.threadID,
          (err, info) => { searchingMsgID = info?.messageID; res(); },
          event.messageID
        );
      });

      const res = await ytSearch(query);
      if (!res.videos.length) {
        if (searchingMsgID) api.unsendMessage(searchingMsgID);
        return api.sendMessage(
          fancy("❌ কিছুই খুঁজে পাওয়া যায়নি!"),
          event.threadID,
          event.messageID
        );
      }
      const video = res.videos[0];
      const url = video.url;
      const safeTitle =
        video.title.replace(/[^\w\s]/gi, "").substring(0, 30) +
        "_" +
        event.senderID;
      const mp4Path = path.join(cachePath, `${safeTitle}.mp4`);

      if (searchingMsgID) await api.unsendMessage(searchingMsgID);
      await new Promise((res2) => {
        api.sendMessage(
          fancy(`🎬 𝘿𝙤𝙬𝙣𝙡𝙤𝙖𝙙𝙞𝙣𝙜 𝙫𝙞𝙙𝙚𝙤: “${video.title}”`),
          event.threadID,
          (err, info) => { downloadingMsgID = info?.messageID; res2(); }
        );
      });

      const stream = ytdl(url, {
        quality: "highest",
        filter: "audioandvideo",
      });
      const ffmpegPath = require("ffmpeg-static");
      const ffmpegCmd = `${ffmpegPath} -y -i pipe:0 -c:v copy -c:a libmp3lame -ab 192k "${mp4Path}"`;
      const ffmpeg = exec(ffmpegCmd);
      stream.pipe(ffmpeg.stdin);

      ffmpeg.on("close", () => {
        if (downloadingMsgID) api.unsendMessage(downloadingMsgID);
        if (!fs.existsSync(mp4Path)) {
          return api.sendMessage(
            fancy("❌ ভিডিও রেন্ডার হয়নি!"),
            event.threadID,
            event.messageID
          );
        }
        if (fs.statSync(mp4Path).size > 25 * 1024 * 1024) {
          fs.unlinkSync(mp4Path);
          return api.sendMessage(
            fancy("❌ ফাইল 25MB এর বেশি!"),
            event.threadID,
            event.messageID
          );
        }
        api.sendMessage(
          {
            body: fancy(`🎬 𝙏𝙤𝙥 𝙑𝙞𝙙𝙚𝙤: ${video.title}`),
            attachment: fs.createReadStream(mp4Path),
          },
          event.threadID,
          () => fs.unlinkSync(mp4Path),
          event.messageID
        );
      });
      ffmpeg.on("error", (err) =>
        api.sendMessage(
          fancy("❌ ভিডিও ডাউনলোডে সমস্যা:\n" + err),
          event.threadID,
          event.messageID
        )
      );
    } catch (err) {
      if (searchingMsgID) api.unsendMessage(searchingMsgID);
      if (downloadingMsgID) api.unsendMessage(downloadingMsgID);
      if (err && err.message && err.message.includes("Sign in to confirm you’re not a bot")) {
        api.sendMessage(fancy("❌ ইউটিউব এখন ডাউনলোড ব্লক করছে। দয়া করে কিছুক্ষণ পরে আবার চেষ্টা করুন বা বট মালিককে জানান।"), event.threadID, event.messageID);
      } else {
        api.sendMessage(
          fancy("❌ ভিডিও ডাউনলোডে সমস্যা:\n" + err),
          event.threadID,
          event.messageID
        );
      }
    }
    return;
  }
};