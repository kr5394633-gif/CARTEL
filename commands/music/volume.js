const { SlashCommandBuilder } = require('discord.js');
const { getMusicPlayer } = require('../../utils/musicPlayer');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the music volume')
    .addIntegerOption((option) =>
      option
        .setName('level')
        .setDescription('Volume level from 0 to 100')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const player = getMusicPlayer();
      const queue = player.nodes.get(interaction.guild);
      const level = interaction.options.getInteger('level');

      if (!queue || !queue.connection) {
        const embed = createEmbed({
          title: '❌ No active player',
          description: 'The bot must be in a voice channel before setting volume.',
          color: '#FF0000',
        });
        return interaction.editReply({ embeds: [embed] });
      }

      queue.node.setVolume(level);

      const embed = createEmbed({
        title: '🔊 Volume updated',
        description: `The volume is now **${level}%**.`,
        color: '#57F287',
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Volume command error:', error);
      const embed = createEmbed({
        title: '❌ Error',
        description: 'The volume could not be updated.',
        color: '#FF0000',
      });
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
