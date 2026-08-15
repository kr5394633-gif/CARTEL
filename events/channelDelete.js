const { AuditLogEvent } = require('discord.js');
const config = require('../config.json');
const antiNuke = require('../utils/antiNuke');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!config.antiNuke.enabled) return;
    const guild = channel.guild;
    if (!guild) return;

    const executor = await antiNuke.getExecutor(guild, AuditLogEvent.ChannelDelete, client);
    if (!executor || antiNuke.isProtected(guild, executor.id, client)) return;

    const count = antiNuke.recordAction(
      guild.id,
      executor.id,
      'channelDelete',
      config.antiNuke.channelDeleteWindowMs
    );

    if (count >= config.antiNuke.channelDeleteThreshold) {
      const member = await guild.members.fetch(executor.id).catch(() => null);
      if (member) await antiNuke.punish(guild, member, 'mass channel deletion', client);
    }
  },
};
