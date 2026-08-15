const config = require('../config.json');
const antiRaid = require('../utils/antiRaid');
const { infoEmbed } = require('../utils/embeds');
const { sendLog } = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // Anti-raid: join-spike detection + new-account quarantine
    await antiRaid.handleJoin(member, client);

    // Verification system: give the Unverified role on join (unless the
    // member was just quarantined by anti-raid, which already set roles)
    if (config.verification.enabled) {
      const unverifiedRole = member.guild.roles.cache.find(
        (r) => r.name === config.verification.unverifiedRole
      );
      if (unverifiedRole && member.roles.cache.size <= 1) {
        try {
          await member.roles.add(unverifiedRole, 'NukeGuard: verification pending');
        } catch (err) {
          console.error('Failed to assign Unverified role:', err.message);
        }
      }
    }

    await sendLog(
      member.guild,
      'joinLeaveLogs',
      infoEmbed(
        'Member Joined',
        `${member.user.tag} (\`${member.id}\`)\nAccount created: <t:${Math.floor(
          member.user.createdTimestamp / 1000
        )}:R>`
      )
    );
  },
};
