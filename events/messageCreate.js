const antiSpam = require('../utils/antiSpam');
const autoMod = require('../utils/autoMod');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // Bad-word filter runs first (deletes + warns + escalates)
    const flaggedByAutoMod = await autoMod.handleMessage(message);
    if (flaggedByAutoMod) return;

    // Then spam/invite/mention checks
    await antiSpam.handleMessage(message);
  },
};
