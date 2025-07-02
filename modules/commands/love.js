
/**
* @author ProCoderMew
* @warn Do not edit code or edit credits
*/

module.exports.config = {
  name: "love", 
  version: "1.0.0", 
  hasPermssion: 0,
  credits: "TOHI-BOT-HUB",
  description: "Create love message between two users",
  usePrefix: true,
  commandCategory: "Love", 
  usages: "love @", 
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": ""
  }
};

const fs = require("fs-extra");
const axios = require("axios");

module.exports.run = async function({ event, api, args, Users }) {
  const { threadID, messageID, senderID, mentions } = event;
  const mentionId = Object.keys(mentions)[0];

  if (!mentionId) {
    return api.sendMessage("❤️ Please tag someone to create a love message!", threadID, messageID);
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
    const loveMessage = `💕 ${senderName} loves ${mentionName} so much! 💕\n\n❤️ True love never ends! ❤️\n\n💌 Love is in the air! 💌`;

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
    console.error("Love command error:", error);
    api.sendMessage("❌ Sorry, couldn't create the love message. Please try again!", threadID, messageID);
  }
};
