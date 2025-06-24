module.exports.config = {
  name: "sendfile",
  version: "1.0.1",
  permission: 0,
  credits: "TOHI-BOT-HUB",
  description: "...",
  usePrefix: true,
  commandCategory: "admin",
  usages: `file name`,
  cooldowns: 5,
  dependencies: {
    "path": "",
    "fs-extra": ""
  }
};
module.exports.run = async ({ args, api, event, Users }) => {
  const permission = ["100092006324917"];
  if (!permission.includes(event.senderID))
    return api.sendMessage('[❗] Only Permission User Can Use This File', event.threadID, event.messageID);

  const fs = require("fs-extra");
  const stringSimilarity = require('string-similarity');

  let file;

  // if message is reply and args is empty, use reply message body as filename
  if (event.type == "message_reply" && (!args[0] || args.join(" ").trim() === "")) {
    file = event.messageReply.body ? event.messageReply.body.trim() : "";
  } else {
    file = args.join(" ").trim();
  }

  if(!file) return api.sendMessage('File name cannot be empty', event.threadID, event.messageID);
  if (!file.endsWith('.js')) return api.sendMessage('The file extension cannot be different .js', event.threadID, event.messageID);

  if(event.type == "message_reply") {
    var uid = event.messageReply.senderID;
    var name = (await Users.getData(uid)).name;
    if(!fs.existsSync(__dirname + "/" + file)) { 
      var mdl = fs.readdirSync(__dirname).filter((file) => file.endsWith(".js"));
      mdl = mdl.map(item => item.replace(/\.js/g, ""));
      var checker = stringSimilarity.findBestMatch(file.replace('.js', ''), mdl);
      var search = checker.bestMatch.rating >= 1 ? checker.bestMatch.target : undefined;
      if(search == undefined) return api.sendMessage('🔎 File not found: ' + file, event.threadID, event.messageID); 
      return api.sendMessage('🔎 File not found: ' + file + ' \n🔎 The file is similar to: ' + search + '.js\n» Drop your reaction in this message to give it.', event.threadID, (error, info) => {
        global.client.handleReaction.push({
          type: 'user',
          name: this.config.name,
          author: event.senderID,
          messageID: info.messageID,
          file: search,
          uid: uid,
          namee: name
        })
      }, event.messageID);
    }
    fs.copyFileSync(__dirname + '/' + file, __dirname + '/' + file.replace(".js",".txt"));
    return api.sendMessage({
      body: '» File ' + file + ' here you are', 
      attachment: fs.createReadStream(__dirname + '/' + file.replace('.js', '.txt'))
    }, uid, () => fs.unlinkSync(__dirname + '/' + file.replace('.js', '.txt'))).then(
      api.sendMessage('» Check your messages ' + name, event.threadID, (error, info) => {
        if(error) return api.sendMessage('» There was an error sending the file to ' + name, event.threadID, event.messageID);
      }, event.messageID));
  }
  else {
    if(!fs.existsSync(__dirname + "/" + file)) { 
      var mdl = fs.readdirSync(__dirname).filter((file) => file.endsWith(".js"));
      mdl = mdl.map(item => item.replace(/\.js/g, ""));
      var checker = stringSimilarity.findBestMatch(file.replace('.js', ''), mdl);
      var search = checker.bestMatch.rating >= 0.5 ? checker.bestMatch.target : undefined;
      if(search == undefined) return api.sendMessage('🔎 File not found: ' + file, event.threadID, event.messageID); 
      return api.sendMessage('🔎 File not found: ' + file + ' \n🔎 File almost like: ' + search + '.js\n» Drop your reaction in this message to give it.', event.threadID, (error, info) => {
        global.client.handleReaction.push({
          type: 'thread',
          name: this.config.name,
          author: event.senderID,
          messageID: info.messageID,
          file: search
        })
      }, event.messageID);
    }
    fs.copyFileSync(__dirname + '/' + file, __dirname + '/' + file.replace(".js",".txt"));
    return api.sendMessage({
      body: '» File ' + file + ' here you are', 
      attachment: fs.createReadStream(__dirname + '/' + file.replace('.js', '.txt'))
    }, event.threadID, () => fs.unlinkSync(__dirname + '/' + file.replace('.js', '.txt')), event.messageID);
  }
}

module.exports.handleReaction = ({ Users, api, event, handleReaction  }) => {
  var { file, author, type, uid, namee } = handleReaction;
  if (event.userID != handleReaction.author) return;
  const fs = require("fs-extra");
  var fileSend = file + '.js';
  switch (type) {
    case "user": {
      fs.copyFileSync(__dirname + '/' + fileSend, __dirname + '/' + fileSend.replace(".js",".txt"));
      api.unsendMessage(handleReaction.messageID);
      return api.sendMessage({
        body: '» File ' + file + ' here you are', 
        attachment: fs.createReadStream(__dirname + '/' + fileSend.replace('.js', '.txt'))
      }, uid, () => fs.unlinkSync(__dirname + '/' + fileSend.replace('.js', '.txt'))).then(
        api.sendMessage('» Check your messages ' + namee, event.threadID, (error, info) => {
          if(error) return api.sendMessage('» There was an error sending the file to ' + namee, event.threadID, event.messageID);
        }, event.messageID));
    }
    case "thread": {
      fs.copyFileSync(__dirname + '/' + fileSend, __dirname + '/' + fileSend.replace(".js",".txt"));
      api.unsendMessage(handleReaction.messageID);
      return api.sendMessage({
        body: '» File ' + file + ' here you are', 
        attachment: fs.createReadStream(__dirname + '/' + fileSend.replace('.js', '.txt'))
      }, event.threadID, () => fs.unlinkSync(__dirname + '/' + fileSend.replace('.js', '.txt')), event.messageID);
    }
  }
}