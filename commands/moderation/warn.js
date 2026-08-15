const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../utils/database');
const { successEmbed, warningEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../utils/logger');
const { applyWarnEscalation } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption((opt) => opt.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the warn').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [warningEmbed('Error', "That user isn't in this server.")], ephemeral: true });
    }
    if (member.permissions.has('Administrator')) {
      return interaction.reply({
        embeds: [warningEmbed('Error', "You can't warn an administrator.")],
        ephemeral: true,
      });
    }

    db.addWarn(interaction.guild.id, target.id, interaction.user.id, reason);
    const warnCount = db.countWarns(interaction.guild.id, target.id);

    await interaction.reply({
      embeds: [successEmbed('Member Warned', `${target} has been warned.\n**Reason:** ${reason}\n**Total warns:** ${warnCount}`)],
    });

    await sendLog(
      interaction.guild,
      'modLogs',
      warningEmbed('Member Warned', `${target} was warned by ${interaction.user}.\n**Reason:** ${reason}\n**Total warns:** ${warnCount}`)
    );

    const action = await applyWarnEscalation(member, warnCount, reason);
    if (action) {
      await interaction.followUp({
        embeds: [warningEmbed('Escalation Triggered', `${target} reached **${warnCount}** warns — action taken: **${action}**.`)],
      });
    }
  },
};
