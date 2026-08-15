const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { warningEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member (with confirmation)')
    .addUserOption((opt) => opt.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (member && !member.bannable) {
      return interaction.reply({
        embeds: [warningEmbed('Error', "I can't ban that member — check role hierarchy.")],
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ban:confirm:${target.id}:${interaction.user.id}`)
        .setLabel('Confirm Ban')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ban:cancel:${target.id}:${interaction.user.id}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    interaction.client.pendingActions = interaction.client.pendingActions || new Map();
    interaction.client.pendingActions.set(`ban:${target.id}:${interaction.user.id}`, reason);

    await interaction.reply({
      embeds: [warningEmbed('Confirm Ban', `Ban ${target} for: **${reason}**?`)],
      components: [row],
    });
  },
};
