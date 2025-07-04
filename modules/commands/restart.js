module.exports.config = {
  name: "restart",
  version: "5.0.2",
  hasPermssion: 2,
  credits: "TOHI-BOT-HUB",
  description: "Restart the bot and reload all configs/modules without downtime. Stylish unsend SMS.",
  usePrefix: true,
  commandCategory: "Admin",
  usages: "restart [reason]",
  cooldowns: 10
};

async function unsendAfter(api, messageID, delay = 3000) {
  setTimeout(() => {
    api.unsendMessage(messageID);
  }, delay);
}

module.exports.run = async function ({ api, event, args, logger }) {
  const { threadID, messageID, senderID } = event;
  const moment = require('moment-timezone');
  const fs = require('fs-extra');

  // Only allow this UID
  if (senderID !== "100092006324917") {
    return api.sendMessage("❌ Sorry, only the bot owner can use this command!", threadID, messageID);
  }

  try {
    const reason = args.join(' ') || 'Manual restart by admin';
    const restartTime = moment().tz('Asia/Dhaka').format('DD/MM/YYYY HH:mm:ss');
    const userInfo = await api.getUserInfo(senderID);
    const adminName = userInfo[senderID]?.name || 'Admin';

    // Stylish restart notification
    const restartMsg = `
╔══════════════════════════╗
  🔄 𝐑𝐄𝐒𝐓𝐀𝐑𝐓 𝐈𝐍 𝐏𝐑𝐎𝐆𝐑𝐄𝐒𝐒.. 
╚══════════════════════════╝

⚙️ 𝐓𝐎𝐇𝐈-𝐁𝐎𝐓 𝐇𝐔𝐁
👑 𝐀𝐝𝐦𝐢𝐧: ${adminName}
📝 𝐑𝐞𝐚𝐬𝐨𝐧: ${reason}
⏰ 𝐓𝐢𝐦𝐞: ${restartTime}

🔄 𝙍𝙚𝙡𝙤𝙖𝙙𝙞𝙣𝙜 𝙖𝙡𝙡 𝙢𝙤𝙙𝙪𝙡𝙚𝙨, 𝙘𝙤𝙣𝙛𝙞𝙜, 𝙖𝙣𝙙 𝙚𝙫𝙚𝙣𝙩𝙨...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    api.sendMessage(restartMsg, threadID, async (err, info) => {
      if (info && info.messageID) unsendAfter(api, info.messageID, 3000); // 3s

      // ...reload logic...

      setTimeout(() => {
        const completeTime = moment().tz('Asia/Dhaka').format('DD/MM/YYYY HH:mm:ss');
        const successMsg = `
╔═══════════════════════╗
 ✅ 𝐑𝐄𝐒𝐓𝐀𝐑𝐓 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐄   
╚═══════════════════════╝

🎉 𝐓𝐎𝐇𝐈-𝐁𝐎𝐓 𝐇𝐔𝐁
✅ 𝐒𝐭𝐚𝐭𝐮𝐬: 𝐎𝐧𝐥𝐢𝐧𝐞 & 𝐑𝐞𝐚𝐝𝐲!
🔄 𝐑𝐞𝐬𝐭𝐚𝐫𝐭 𝐓𝐢𝐦𝐞: ${completeTime}
📂 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬: ${global.client?.commands?.size || 0}
🎯 𝐄𝐯𝐞𝐧𝐭𝐬: ${global.client?.events?.size || 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 𝐀𝐥𝐥 𝐜𝐨𝐧𝐟𝐢𝐠, 𝐜𝐨𝐦𝐦𝐚𝐧𝐝, 𝐞𝐯𝐞𝐧𝐭 𝐟𝐢𝐥𝐞𝐬 𝐫𝐞𝐥𝐨𝐚𝐝𝐞𝐝!
`;
        api.sendMessage(successMsg, threadID, (e, i) => {
          if (i && i.messageID) unsendAfter(api, i.messageID, 4000); // 4s
        });
      }, 2000);
    });
  } catch (error) {
    logger.log('❌ Restart command error: ' + error, "RESTART");
    api.sendMessage('❌ Restart failed. Please check logs.', threadID, messageID, (err, info) => {
      if (info && info.messageID) unsendAfter(api, info.messageID, 4000);
    });
  }
};