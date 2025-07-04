module.exports.config = {
  name: "reboot",
  version: "1.0.1",
  hasPermssion: 2,
  credits: "TOHI-BOT-HUB",
  description: "Reboot all bot modules and restart system",
  commandCategory: "admin",
  usages: "reboot",
  cooldowns: 10,
  usePrefix: true,
  dependencies: {
    "fs-extra": "",
    "child_process": ""
  }
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const fs = require("fs-extra");

  // Only allow owner UID
  if (senderID !== "100092006324917") {
    return api.sendMessage("❌ এই কমান্ডটি কেবল বট মালিক ব্যবহার করতে পারবে!", threadID, messageID);
  }

  try {
    // Send reboot start message
    const rebootMsg = await api.sendMessage(
      `╭━━━━━━━━━━━━━━━━━━━━━━━━
       ┃  🔄 𝗥𝗘𝗕𝗢𝗢𝗧 𝗦𝗧𝗔𝗥𝗧𝗜𝗡𝗚...
       ╰━━━━━━━━━━━━━━━━━━━━━━━━
⏳ ক‍্যাশ, সকল কমান্ড ও ইভেন্ট রিলোড হচ্ছে...`,
      threadID
    );

    // Clear all command/event cache
    const commandsPath = `${global.client.mainPath}/modules/commands`;
    const eventsPath = `${global.client.mainPath}/modules/events`;

    Object.keys(require.cache).forEach(key => {
      if (key.includes('/modules/commands/') || key.includes('/modules/events/')) {
        delete require.cache[key];
      }
    });

    // Clear client data
    global.client.commands.clear();
    global.client.events.clear();
    global.client.eventRegistered = [];
    global.client.handleSchedule = [];
    global.client.handleReaction = [];
    global.client.handleReply = [];

    // Edit message: cache cleared, reloading modules
    api.editMessage(
      `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       ┃  🔄 𝗕𝗢𝗧 𝗥𝗘𝗕𝗢𝗢𝗧 𝗜𝗡 𝗣𝗥𝗢𝗚𝗥𝗘𝗦𝗦...
       ╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ক‍্যাশ ক্লিয়ারড!
☑️ কমান্ড ও ইভেন্ট রিলোড করা হচ্ছে...`,
      rebootMsg.messageID, threadID
    );

    // Reload all commands
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    let commandsLoaded = 0, commandsFailed = 0;
    for (const file of commandFiles) {
      try {
        delete require.cache[require.resolve(`${commandsPath}/${file}`)];
        const command = require(`${commandsPath}/${file}`);
        if (command.config && command.config.name && command.run) {
          global.client.commands.set(command.config.name, command);
          if (command.handleEvent) global.client.eventRegistered.push(command.config.name);
          commandsLoaded++;
        }
      } catch (error) {
        commandsFailed++;
        console.error(`Failed to reload command ${file}:`, error.message);
      }
    }

    // Reload all events
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    let eventsLoaded = 0, eventsFailed = 0;
    for (const file of eventFiles) {
      try {
        delete require.cache[require.resolve(`${eventsPath}/${file}`)];
        const evt = require(`${eventsPath}/${file}`);
        if (evt.config && evt.config.name && evt.run) {
          global.client.events.set(evt.config.name, evt);
          global.client.eventRegistered.push(evt.config.name);
          eventsLoaded++;
        }
      } catch (error) {
        eventsFailed++;
        console.error(`Failed to reload event ${file}:`, error.message);
      }
    }

    // Clear memory cache
    if (global.gc && typeof global.gc === 'function') {
      global.gc();
    }

    // Final success message
    const successMsg =
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  ✅ 𝗕𝗢𝗧 𝗥𝗘𝗕𝗢𝗢𝗧 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗘!    ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
🎉 সফলভাবে রিবুট শেষ!
🔧 Commands: ${commandsLoaded} ✅, ${commandsFailed} ⚠️
⚡ Events: ${eventsLoaded} ✅, ${eventsFailed} ⚠️
🧹 Cache cleaned, Memory optimized!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 UID: 100092006324917
`;

    api.editMessage(successMsg, rebootMsg.messageID, threadID);

    console.log(`[REBOOT] Bot rebooted by ${senderID}. Commands: ${commandsLoaded}, Events: ${eventsLoaded}`);

  } catch (error) {
    console.error("Reboot error:", error);
    api.sendMessage(`❌ রিবুট করতে সমস্যা হয়েছে:\n${error.message}`, threadID, messageID);
  }
};