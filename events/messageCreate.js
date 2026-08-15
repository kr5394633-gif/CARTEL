const antiSpam = require('../utils/antiSpam');
const autoMod = require('../utils/autoMod');
const { prefix } = require('../config.json');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const trimmed = message.content.trim();
    if (trimmed.startsWith(prefix)) {
      const command = trimmed.slice(prefix.length).trim().toLowerCase();

      if (!command) {
        return message.reply("Prefix is set to `<`.\nUse slash commands like `/help` or text commands like `<help` and `<ping`.");
      }

      if (command === 'help') {
        return message.reply("Use slash commands for the bot. Example: `/help`, `/play`, `/security-status`\nLegacy prefix commands are enabled with `<` as the prefix.");
      }

      if (command === 'ping') {
        return message.reply(`Pong! Latency: ${Date.now() - message.createdTimestamp}ms`);
      }

      return;
    }

    // Bad-word filter runs first (deletes + warns + escalates)
    const flaggedByAutoMod = await autoMod.handleMessage(message);
    if (flaggedByAutoMod) return;

    // Then spam/invite/mention checks
    await antiSpam.handleMessage(message);
  },
};
