const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const axios = require("axios");

module.exports.config = {
  name: "converter",
  version: "1.1.0",
  hasPermssion: 0,
  usePrefix: true,
  credits: "TOHI-BOT-HUB",
  description: "Video↔Audio convert, video to direct link, audio to video, etc.",
  commandCategory: "tool",
  usages: "/converter [video2link|video2audio|audio2video] [file (reply)]\nOr just use /video2link, /video2audio, /audio2video",
  cooldowns: 8,
  dependencies: {
    "fs-extra": "",
    "child_process": "",
    "ffmpeg-static": "",
    "axios": ""
  },
  aliases: ["video2link", "video2audio", "audio2video"]
};

const cachePath = path.join(__dirname, "cache");
if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);

function fancy(text) {
  return `『✦⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯✦』\n⫸ TBH ➤\n${text}\n『✦⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯✦』\nCredits: TOHI-BOT-HUB`;
}

function autoUnsend(api, threadID, messageID, delay = 12000) {
  setTimeout(() => api.unsendMessage(messageID, () => {}), delay);
}

async function downloadFile(url, outPath) {
  const { data } = await axios.get(url, { responseType: "stream" });
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(outPath);
    data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function video2audio(input, output) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      "-y", "-i", input,
      "-vn", "-acodec", "libmp3lame", "-ab", "192k", output
    ]);
    ffmpeg.on("close", code => code === 0 ? resolve() : reject(new Error("ffmpeg exited with code " + code)));
    ffmpeg.on("error", reject);
  });
}

async function audio2video(input, output) {
  const blackBg = path.join(cachePath, "black.jpg");
  if (!fs.existsSync(blackBg)) {
    await new Promise((res, rej) => {
      const ff = spawn(ffmpegPath, [
        "-f", "lavfi", "-i", "color=c=black:s=1280x720:d=1", "-frames:v", "1", blackBg
      ]);
      ff.on("close", code => code === 0 ? res() : rej("Error making black bg"));
      ff.on("error", rej);
    });
  }
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      "-y", "-loop", "1", "-i", blackBg, "-i", input,
      "-c:v", "libx264", "-c:a", "aac", "-b:a", "192k", "-shortest", output
    ]);
    ffmpeg.on("close", code => code === 0 ? resolve() : reject(new Error("ffmpeg exited with code " + code)));
    ffmpeg.on("error", reject);
  });
}

module.exports.run = async function({ api, event, args, commandName }) {
  // Detect if called as alias (so, /video2link, /video2audio, /audio2video)
  let type = "";
  const aliases = ["video2link", "video2audio", "audio2video"];
  if (aliases.includes((commandName || "").toLowerCase())) {
    type = (commandName || "").toLowerCase();
  } else if (args[0] && aliases.includes(args[0].toLowerCase())) {
    type = args[0].toLowerCase();
  }

  // Fallback usage
  if (!type) {
    const msg = await api.sendMessage(
      fancy("⚙️  Converter Usage:\n/converter video2link (reply video)\n/converter video2audio (reply video)\n/converter audio2video (reply audio)\n\nOr just use /video2link, /video2audio, /audio2video directly!"),
      event.threadID, event.messageID
    );
    if (msg && msg.messageID) autoUnsend(api, event.threadID, msg.messageID, 15000);
    return;
  }

  // Must reply with file
  if (!event.messageReply || !event.messageReply.attachments || !event.messageReply.attachments[0]) {
    const msg = await api.sendMessage(fancy("⚠️ অবশ্যই ভিডিও বা অডিও reply দিয়ে কমান্ড দিন!"), event.threadID, event.messageID);
    if (msg && msg.messageID) autoUnsend(api, event.threadID, msg.messageID, 12000);
    return;
  }

  const att = event.messageReply.attachments[0];
  const url = att.url;
  const ext = path.extname(att.name || (att.type === "audio" ? ".mp3" : ".mp4"));
  const safeName = `conv_${event.senderID}_${Date.now()}${ext}`;
  const filePath = path.join(cachePath, safeName);

  // Download file
  const loadingMsg = await api.sendMessage(fancy("⏬ Downloading file, please wait..."), event.threadID, event.messageID);
  try {
    await downloadFile(url, filePath);

    // VIDEO TO LINK
    if (type === "video2link") {
      await api.editMessage(fancy(`🌐 Direct Video Link:\n${url}`), loadingMsg.messageID, event.threadID);
      autoUnsend(api, event.threadID, loadingMsg.messageID, 20000);
      fs.unlinkSync(filePath);
      return;
    }

    // VIDEO TO AUDIO
    if (type === "video2audio") {
      const out = filePath.replace(/\.\w+$/, ".mp3");
      await api.editMessage(fancy("🎵 Converting video to audio..."), loadingMsg.messageID, event.threadID);
      await video2audio(filePath, out);
      await api.editMessage(fancy("🎧 Here is your audio:"), loadingMsg.messageID, event.threadID);
      await api.sendMessage({ attachment: fs.createReadStream(out) }, event.threadID, () => {
        fs.unlinkSync(filePath);
        fs.unlinkSync(out);
      }, event.messageID);
      autoUnsend(api, event.threadID, loadingMsg.messageID, 10000);
      return;
    }

    // AUDIO TO VIDEO
    if (type === "audio2video") {
      const out = filePath.replace(/\.\w+$/, ".mp4");
      await api.editMessage(fancy("🎬 Converting audio to video..."), loadingMsg.messageID, event.threadID);
      await audio2video(filePath, out);
      await api.editMessage(fancy("🎥 Here is your video:"), loadingMsg.messageID, event.threadID);
      await api.sendMessage({ attachment: fs.createReadStream(out) }, event.threadID, () => {
        fs.unlinkSync(filePath);
        fs.unlinkSync(out);
      }, event.messageID);
      autoUnsend(api, event.threadID, loadingMsg.messageID, 10000);
      return;
    }

  } catch (e) {
    await api.editMessage(fancy("❌ কনভার্ট/ডাউনলোড সমস্যা:\n" + e), loadingMsg.messageID, event.threadID);
    autoUnsend(api, event.threadID, loadingMsg.messageID, 12000);
    try { fs.unlinkSync(filePath); } catch {}
    return;
  }
};

// Aliases for direct command use
module.exports.aliases = ["video2link", "video2audio", "audio2video"];