const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { successEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify-setup')
    .setDescription('Post the verification button panel in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const panel = infoEmbed(
      '✅ Server Verification',
      'Click the button below to verify yourself and get full access to this server.'
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify:click').setLabel('Verify Me').setStyle(ButtonStyle.Success).setEmoji('✅')
    );

    await interaction.channel.send({ embeds: [panel], components: [row] });
    await interaction.reply({ embeds: [successEmbed('Panel Posted', 'Verification panel has been posted in this channel.')], ephemeral: true });
  },
};
