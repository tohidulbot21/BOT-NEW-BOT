
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports.config = {
  name: "love2",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "TOHI-BOT-HUB",
  description: "Create love image between two users",
  usePrefix: true,
  commandCategory: "image",
  usages: "[tag someone]",
  cooldowns: 5,
  dependencies: {
    "fs-extra": "",
    "axios": ""
  }
};

module.exports.onLoad = async () => {
  const cachePath = path.join(__dirname, "cache");
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
  }
};

module.exports.run = async function ({ event, api, args, Users }) {
  const { threadID, messageID, senderID, mentions } = event;
  const mentionId = Object.keys(mentions)[0];

  if (!mentionId) {
    return api.sendMessage('❤️ Please tag someone to create a love image!', threadID, messageID);
  }

  try {
    // Get user info
    const senderInfo = await Users.getData(senderID);
    const mentionInfo = await Users.getData(mentionId);
    
    const senderName = senderInfo.name || "User";
    const mentionName = mentionInfo.name || mentions[mentionId]?.replace('@', '');

    // Get avatars
    const senderAvatar = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const mentionAvatar = `https://graph.facebook.com/${mentionId}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

    // Create love message
    const loveMessage = `💕 ${senderName} loves ${mentionName} so much! 💕\n\n❤️ True love never ends! ❤️`;

    // Download avatars and send
    const senderImg = await axios.get(senderAvatar, { responseType: 'stream' });
    const mentionImg = await axios.get(mentionAvatar, { responseType: 'stream' });

    api.sendMessage({
      body: loveMessage,
      mentions: [
        { tag: senderName, id: senderID },
        { tag: mentionName, id: mentionId }
      ],
      attachment: [senderImg.data, mentionImg.data]
    }, threadID, messageID);

  } catch (error) {
    console.error("Love2 command error:", error);
    api.sendMessage("❌ Sorry, couldn't create the love image. Please try again!", threadID, messageID);
  }
};
