const { AuditLogEvent } = require('discord.js');
const config = require('../config.json');
const antiNuke = require('../utils/antiNuke');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    if (!config.antiNuke.enabled) return;
    const guild = ban.guild;
    if (!guild) return;

    const executor = await antiNuke.getExecutor(guild, AuditLogEvent.MemberBanAdd, client);
    if (!executor || antiNuke.isProtected(guild, executor.id, client)) return;

    // don't count NukeGuard's own anti-nuke bans against the offender's rate
    if (executor.id === client.user.id) return;

    const count = antiNuke.recordAction(guild.id, executor.id, 'ban', config.antiNuke.banWindowMs);

    if (count >= config.antiNuke.banThreshold) {
      const member = await guild.members.fetch(executor.id).catch(() => null);
      if (member) await antiNuke.punish(guild, member, 'mass banning members', client);
    }
  },
};
