const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.json');
const db = require('../../utils/database');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('security-status')
    .setDescription('Live protection dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const whitelist = db.getWhitelist(interaction.guild.id);

    const embed = infoEmbed('🛡️ NukeGuard Security Dashboard')
      .addFields(
        {
          name: 'Anti-Raid',
          value: config.antiRaid.enabled
            ? `✅ On — ${config.antiRaid.joinThreshold} joins / ${config.antiRaid.joinWindowMs / 1000}s → ${config.antiRaid.action}`
            : '❌ Off',
        },
        {
          name: 'Anti-Nuke',
          value: config.antiNuke.enabled
            ? `✅ On — punishment: **${config.antiNuke.punishment}**\n` +
              `Channels: ${config.antiNuke.channelDeleteThreshold}/${config.antiNuke.channelDeleteWindowMs / 1000}s | ` +
              `Roles: ${config.antiNuke.roleDeleteThreshold}/${config.antiNuke.roleDeleteWindowMs / 1000}s | ` +
              `Bans: ${config.antiNuke.banThreshold}/${config.antiNuke.banWindowMs / 1000}s`
            : '❌ Off',
        },
        {
          name: 'Anti-Spam',
          value: config.antiSpam.enabled
            ? `✅ On — ${config.antiSpam.messageThreshold} msgs / ${config.antiSpam.windowMs / 1000}s → ${config.antiSpam.muteMinutes}m mute\n` +
              `Invite links: ${config.antiSpam.deleteInvites ? 'auto-delete' : 'off'} | Mass mentions: ${config.antiSpam.deleteMassMentions ? `auto-delete (${config.antiSpam.massMentionThreshold}+)` : 'off'}`
            : '❌ Off',
        },
        {
          name: 'Auto-Mod',
          value: `${(config.autoMod.badWords || []).length} filtered word(s) • Escalation: ${Object.entries(config.autoMod.warnEscalation).map(([k, v]) => `${k}→${v}`).join(', ')}`,
        },
        {
          name: 'Verification',
          value: config.verification.enabled
            ? `✅ On — ${config.verification.unverifiedRole} → ${config.verification.verifiedRole}`
            : '❌ Off',
        },
        { name: 'Whitelisted Users', value: whitelist.length > 0 ? whitelist.map((id) => `<@${id}>`).join(', ') : 'None' }
      );

    await interaction.reply({ embeds: [embed] });
  },
};
