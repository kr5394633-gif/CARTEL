const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, warningEmbed } = require('../../utils/embeds');
const { sendLog } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member')
    .addUserOption((opt) => opt.setName('user').setDescription('Member to mute').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320)
    )
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the mute').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [warningEmbed('Error', "That user isn't in this server.")], ephemeral: true });
    }
    if (!member.moderatable) {
      return interaction.reply({
        embeds: [warningEmbed('Error', "I can't timeout that member — check role hierarchy and my Moderate Members permission.")],
        ephemeral: true,
      });
    }

    try {
      await member.timeout(minutes * 60 * 1000, reason);
    } catch (err) {
      return interaction.reply({ embeds: [warningEmbed('Error', `Failed to mute: ${err.message}`)], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed('Member Muted', `${target} has been muted for **${minutes} minute(s)**.\n**Reason:** ${reason}`)] });
    await sendLog(
      interaction.guild,
      'modLogs',
      warningEmbed('Member Muted', `${target} was muted by ${interaction.user} for ${minutes} minute(s).\n**Reason:** ${reason}`)
    );
  },
};
