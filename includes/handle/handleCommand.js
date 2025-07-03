const threadHealthChecker = require("../../utils/threadHealthChecker");

module.exports = function ({ api, Users, Threads, Currencies, logger, botSettings }) {
  const moment = require("moment-timezone");
  const axios = require("axios");

  // Levenshtein Distance for typo correction
  function getLevenshtein(a, b) {
    const matrix = [];
    let i;
    for (i = 0; i <= b.length; i++) matrix[i] = [i];
    let j;
    for (j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  // Enhanced error checking
  function shouldIgnoreError(error) {
    if (!error) return true;
    const errorStr = error.toString().toLowerCase();
    const ignorablePatterns = [
      'rate limit', 'enoent', 'network timeout', 'connection reset',
      'does not exist in database', 'you can\'t use this feature', 'took too long to execute',
      'command timeout', 'execution timeout', 'request timeout', 'socket timeout', 'network error',
      'api error', 'facebook error', 'permission denied', 'access denied', 'invalid session',
      'login required', 'cannot read properties of undefined', 'getname is not a function', 'mqtt',
      'attachment url', 'has no valid run or onstart function', 'command has no valid', 'no valid function',
      'function is not defined'
    ];
    return ignorablePatterns.some(pattern => errorStr.includes(pattern));
  }

  // Enhanced cooldown management
  const cooldowns = new Map();
  const userActivity = new Map();
  function checkCooldown(userID, commandName, cooldownTime) {
    if (!cooldownTime || cooldownTime <= 0) return true;
    const key = `${userID}_${commandName}`;
    const now = Date.now();
    const lastUsed = cooldowns.get(key) || 0;
    if (now - lastUsed < cooldownTime * 1000) return false;
    cooldowns.set(key, now);
    return true;
  }

  // Command execution function
  async function executeCommand(command, Obj, commandName) {
    try {
      if (typeof command.run === 'function') return await command.run(Obj);
      else if (typeof command.onStart === 'function') return await command.onStart(Obj);
      else if (typeof command.start === 'function') return await command.start(Obj);
      else throw new Error(`Command ${commandName} has no valid execution function`);
    } catch (error) {
      throw error;
    }
  }

  return async function handleCommand({ event }) {
    try {
      if (!event || !event.body) return;
      const { api } = global.client;
      const { commands } = global.client;
      const { threadID, messageID, senderID } = event;

      // Check if thread is disabled
      if (threadHealthChecker && threadHealthChecker.isThreadDisabled && threadHealthChecker.isThreadDisabled(threadID)) return;

      // Group approval
      const fs = require('fs');
      const configPath = require('path').join(__dirname, '../../config.json');
      let approvalConfig = {};
      try {
        const configData = fs.readFileSync(configPath, 'utf8');
        approvalConfig = JSON.parse(configData);
      } catch (error) {
        approvalConfig = { APPROVAL: { approvedGroups: [] } };
      }
      if (!approvalConfig.APPROVAL) {
        approvalConfig.APPROVAL = { approvedGroups: [], pendingGroups: [], rejectedGroups: [] };
      }
      if (event.threadID && event.threadID !== event.senderID) {
        const threadID = String(event.threadID);
        const senderID = String(event.senderID);
        const isApproved = approvalConfig.APPROVAL.approvedGroups.includes(threadID);
        const isOwner = global.config.ADMINBOT && global.config.ADMINBOT.includes(senderID);
        if (!isApproved) {
          const messageBody = event.body || "";
          const prefix = global.config.PREFIX || "/";
          const commandName = messageBody.replace(prefix, "").split(" ")[0].toLowerCase();
          if (commandName === "approve" && isOwner) {
            console.log(`[APPROVAL] Owner using approve command in unapproved group: ${threadID}`);
          } else {
            console.log(`[APPROVAL] Blocked command "${commandName}" in unapproved group: ${threadID}`);
            return;
          }
        }
      }

      // Get thread settings
      const threadData = global.data.threadData.get(threadID) || {};
      const prefix = threadData.PREFIX || global.config.PREFIX || "/";

      // Prefix & usePrefix Logic
      const messageBody = event.body.trim();
      let msg = messageBody;
      let isPrefixed = false;
      if (msg.startsWith(prefix)) {
        isPrefixed = true;
        msg = msg.slice(prefix.length).trim();
      }

      // Parse command name & args
      let cmdName = msg.split(/\s+/)[0].toLowerCase();
      const args = msg.split(/\s+/).slice(1);

      // Get command (by name or aliases)
      let command = commands.get(cmdName);
      if (!command) {
        for (const [name, cmd] of commands) {
          if (cmd.config.aliases && Array.isArray(cmd.config.aliases)) {
            if (cmd.config.aliases.includes(cmdName)) {
              command = cmd;
              break;
            }
          }
        }
      }

      // Fuzzy typo auto-correct: If not found, try closest command (distance 1 or 2), but DON'T send SMS
      if (!command) {
        const allCmdNames = Array.from(commands.keys());
        // Gather aliases too
        for (const [name, cmd] of commands) {
          if (cmd.config.aliases && Array.isArray(cmd.config.aliases)) {
            allCmdNames.push(...cmd.config.aliases);
          }
        }
        let closest = null, closestDist = 99;
        for (const c of allCmdNames) {
          const dist = getLevenshtein(cmdName, c);
          if (dist < closestDist) {
            closestDist = dist;
            closest = c;
          }
        }
        // Accept if distance is 1 or 2 (typo/similar) but DO NOT send any sms
        if (closest && closestDist <= 2) {
          let fixed = commands.get(closest);
          if (!fixed) {
            for (const [name, cmd] of commands) {
              if (cmd.config.aliases && cmd.config.aliases.includes(closest)) {
                fixed = cmd;
                break;
              }
            }
          }
          if (fixed) {
            command = fixed;
            cmdName = closest;
            // NO SMS HERE!
          }
        }
      }
      if (!command) return;

      // usePrefix logic
      if (command.config.usePrefix === true && !isPrefixed) return;
      if (command.config.usePrefix === false && isPrefixed) return;

      const commandConfig = command.config;

      // Permission check
      if (commandConfig.permission > 0) {
        const isAdmin = global.config.ADMINBOT?.includes(senderID);
        if (!isAdmin && commandConfig.permission >= 2) return;
      }

      // Cooldown check
      if (commandConfig.cooldowns && !checkCooldown(senderID, cmdName, commandConfig.cooldowns)) {
        return api.sendMessage(
          `『⏳』𝙏𝙊𝙃𝙄-𝘽𝙊𝙏 𝙃𝙐𝘽\n━━━━━━━━━━━━━━━\n⚠️ 𝙋𝙡𝙚𝙖𝙨𝙚 𝙬𝙖𝙞𝙩 𝙗𝙚𝙛𝙤𝙧𝙚 𝙪𝙨𝙞𝙣𝙜 𝙩𝙝𝙞𝙨 𝙘𝙤𝙢𝙢𝙖𝙣𝙙 𝙖𝙜𝙖𝙞𝙣!\n━━━━━━━━━━━━━━━\n『🔰』𝑪𝒓𝒆𝒅𝒊𝒕: 𝑻𝑩𝑯`,
          threadID, messageID
        );
      }

      // Thread/User ban check
      const threadBanned = global.data.threadBanned.has(threadID);
      const userBanned = global.data.userBanned.has(senderID);
      const commandBanned = global.data.commandBanned.get(threadID)?.includes(cmdName) ||
        global.data.commandBanned.get(senderID)?.includes(cmdName);

      if (threadBanned || userBanned || commandBanned) {
        return api.sendMessage(
          `『🚫』𝙏𝙊𝙃𝙄-𝘽𝙊𝙏 𝙃𝙐𝘽\n━━━━━━━━━━━━━━━\n❌ 𝙔𝙤𝙪 𝙤𝙧 𝙩𝙝𝙞𝙨 𝙩𝙝𝙧𝙚𝙖𝙙 𝙞𝙨 𝙗𝙖𝙣𝙣𝙚𝙙 𝙛𝙧𝙤𝙢 𝙪𝙨𝙞𝙣𝙜 𝙘𝙤𝙢𝙢𝙖𝙣𝙙𝙨!\n━━━━━━━━━━━━━━━\n『🔰』𝑪𝒓𝒆𝒅𝒊𝒕: 𝑻𝑩𝑯`,
          threadID, messageID
        );
      }

      // Rate limiting
      if (botSettings?.RATE_LIMITING?.ENABLED) {
        const lastActivity = userActivity.get(senderID) || 0;
        const now = Date.now();
        const interval = botSettings.RATE_LIMITING.MIN_MESSAGE_INTERVAL || 8000;
        if (now - lastActivity < interval) {
          return api.sendMessage(
            `『⏱️』𝙏𝙊𝙃𝙄-𝘽𝙊𝙏 𝙃𝙐𝘽\n━━━━━━━━━━━━━━━\n⚡️ 𝙏𝙤𝙤 𝙈𝙖𝙣𝙮 𝙍𝙚𝙦𝙪𝙚𝙨𝙩𝙨! 𝙋𝙡𝙚𝙖𝙨𝙚 𝙨𝙡𝙤𝙬 𝙙𝙤𝙬𝙣.\n━━━━━━━━━━━━━━━\n『🔰』𝑪𝒓𝒆𝒅𝒊𝒕: 𝑻𝑩𝑯`,
            threadID, messageID
          );
        }
        userActivity.set(senderID, now);
      }

      // Stylish fallback messages
      const fallbackMessages = {
        "moduleInfo": `
『✦⎯⎯⎯⎯⎯ TOHI-BOT HUB ⎯⎯⎯⎯⎯✦』
🌟 𝙈𝙊𝘿𝙐𝙇𝙀 𝙄𝙉𝙁𝙊 🌟
━━━━━━━━━━━━━━━━━━━━━
🆔 𝙉𝙖𝙢𝙚        : %1
💡 𝘿𝙚𝙨𝙘         : %2
📖 𝙐𝙨𝙖𝙜𝙚        : %3
📂 𝘾𝙖𝙩𝙚𝙜𝙤𝙧𝙮    : %4
⏳ 𝘾𝙤𝙤𝙡𝙙𝙤𝙬𝙣    : %5s
🔑 𝙋𝙚𝙧𝙢𝙞𝙨𝙨𝙞𝙤𝙣  : %6
━━━━━━━━━━━━━━━━━━━━━
『🔰』𝑪𝒓𝒆𝒅𝒊𝒕: 𝙈𝙖𝙙𝙚 𝙗𝙮 𝙏𝙊𝙃𝙄-𝘽𝙊𝙏-𝙃𝙐𝘽
`,
        "helpList": `✨ 𝙏𝙊𝙃𝙄-𝘽𝙊𝙏 𝙃𝙐𝘽 𝙝𝙖𝙨 %1 𝙘𝙤𝙢𝙢𝙖𝙣𝙙𝙨 𝙖𝙫𝙖𝙞𝙡𝙖𝙗𝙡𝙚!
🔍 𝙏𝙄𝙋: 𝙏𝙮𝙥𝙚 %2help [command name] for details!`,
        "user": "User",
        "adminGroup": "Admin Group",
        "adminBot": "Admin Bot",
        "on": "on",
        "off": "off",
        "successText": "Success!",
        "error": "An error occurred",
        "missingInput": "Please provide required input",
        "noPermission": "You don't have permission to use this command",
        "cooldown": "Please wait before using this command again",
        "levelup": "Congratulations {name}, you leveled up to level {level}!",
        "reason": "Reason",
        "at": "at",
        "banSuccess": "User banned successfully",
        "unbanSuccess": "User unbanned successfully"
      };

      const fallbackGetText = (key, ...args) => {
        try {
          if (global.getText && typeof global.getText === 'function') {
            const result = global.getText(key, ...args);
            if (result && result !== key) {
              return result;
            }
          }
        } catch (e) { }
        if (fallbackMessages[key]) {
          let message = fallbackMessages[key];
          for (let i = 0; i < args.length; i++) {
            message = message.replace(new RegExp(`%${i + 1}`, 'g'), args[i] || '');
            message = message.replace(new RegExp(`\\{${i + 1}\\}`, 'g'), args[i] || '');
          }
          return message;
        }
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      };

      // Create enhanced run object
      const Obj = {
        api,
        event,
        args,
        Users,
        Threads,
        Currencies,
        permssion: commandConfig.permission || 0,
        getText: fallbackGetText,
        logger
      };

      // Enhanced user info
      try {
        if (!global.data.userName.has(senderID)) {
          const userInfo = await api.getUserInfo(senderID);
          if (userInfo && userInfo[senderID]) {
            global.data.userName.set(senderID, userInfo[senderID].name || "Unknown User");
          }
        }
      } catch (e) { }

      const userName = global.data.userName.get(senderID) || "Unknown User";
      logger.log(`Command "${cmdName}" used by ${userName} (${senderID})`, "COMMAND");

      // Execute command with enhanced error handling
      try {
        await executeCommand(command, Obj, cmdName);
      } catch (error) {
        if (error.message && error.message.includes('Missing catch or finally after try')) {
          logger.log(`Syntax error in command "${cmdName}": ${error.message}`, "ERROR");
          return api.sendMessage(`⚠️ Command "${cmdName}" has a syntax error and needs to be fixed.`, threadID, messageID);
        }
        if (shouldIgnoreError(error)) {
          logger.log(`Command "${cmdName}" issue: ${error.message}`, "DEBUG");
        } else {
          logger.log(`Command "${cmdName}" error: ${error.message}`, "ERROR");
        }
      }
    } catch (error) {
      if (!shouldIgnoreError(error)) {
        logger.log(`HandleCommand error: ${error.message}`, "ERROR");
      }
    }
  };
};