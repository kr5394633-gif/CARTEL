const { AuditLogEvent } = require('discord.js');
const config = require('../config.json');
const antiNuke = require('../utils/antiNuke');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    if (!config.antiNuke.enabled) return;
    const guild = role.guild;
    if (!guild) return;

    const executor = await antiNuke.getExecutor(guild, AuditLogEvent.RoleDelete, client);
    if (!executor || antiNuke.isProtected(guild, executor.id, client)) return;

    const count = antiNuke.recordAction(guild.id, executor.id, 'roleDelete', config.antiNuke.roleDeleteWindowMs);

    if (count >= config.antiNuke.roleDeleteThreshold) {
      const member = await guild.members.fetch(executor.id).catch(() => null);
      if (member) await antiNuke.punish(guild, member, 'mass role deletion', client);
    }
  },
};
