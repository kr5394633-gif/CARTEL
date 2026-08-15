const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { warningEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member (with confirmation)')
    .addUserOption((opt) => opt.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [warningEmbed('Error', "That user isn't in this server.")], ephemeral: true });
    }
    if (!member.kickable) {
      return interaction.reply({
        embeds: [warningEmbed('Error', "I can't kick that member — check role hierarchy.")],
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`kick:confirm:${target.id}:${interaction.user.id}`)
        .setLabel('Confirm Kick')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`kick:cancel:${target.id}:${interaction.user.id}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    // stash the reason where the button handler can find it
    interaction.client.pendingActions = interaction.client.pendingActions || new Map();
    interaction.client.pendingActions.set(`kick:${target.id}:${interaction.user.id}`, reason);

    await interaction.reply({
      embeds: [warningEmbed('Confirm Kick', `Kick ${target} for: **${reason}**?`)],
      components: [row],
    });
  },
};
