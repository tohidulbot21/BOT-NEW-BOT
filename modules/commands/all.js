module.exports.config = {
  name: "all",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "TOHI-BOT-HUB",
  description: "সকল গ্রুপ মেম্বারকে ট্যাগ করুন (everyone mention)",
  commandCategory: "group",
  usages: "/all [message] বা /all",
  cooldowns: 5,
  usePrefix: true,
};

module.exports.run = async function({ api, event, args }) {
  try {
    // Group member fetch
    const threadInfo = await api.getThreadInfo(event.threadID);
    const members = threadInfo.participantIDs.filter(uid => uid != api.getCurrentUserID());

    // Custom message or default
    let msg = args.length > 0 ? args.join(" ") : "👋 𝙀𝙫𝙚𝙧𝙮𝙤𝙣𝙚!";
    // Add @everyone if not present and no custom message
    if (!args.length || msg.toLowerCase().includes("@everyone")) msg = `@everyone\n${msg.replace(/@everyone/gi, "").trim()}`;

    // Mentions array build
    const mentions = members.map(uid => ({
      tag: "★", // will be replaced by name, but shows no error if not
      id: uid
    }));

    // Send message with all mentions (Facebook limits ~50 per message)
    const chunkSize = 50;
    for (let i = 0; i < mentions.length; i += chunkSize) {
      const chunk = mentions.slice(i, i + chunkSize);
      await api.sendMessage({
        body: msg,
        mentions: chunk
      }, event.threadID);
    }
  } catch (e) {
    api.sendMessage("❌ সবাইকে ট্যাগ করতে সমস্যা হয়েছে!\n" + e, event.threadID, event.messageID);
  }
};