const { SlashCommandBuilder } = require('discord.js');
const { getMusicPlayer } = require('../../utils/musicPlayer');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave the current voice channel'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const player = getMusicPlayer();
      const queue = player.nodes.get(interaction.guild);

      if (!queue || !queue.connection) {
        const embed = createEmbed({
          title: '❌ Not connected',
          description: 'The bot is not connected to any voice channel.',
          color: '#FF0000',
        });
        return interaction.editReply({ embeds: [embed] });
      }

      queue.delete();

      const embed = createEmbed({
        title: '👋 Left voice channel',
        description: 'The bot has left the voice channel.',
        color: '#57F287',
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Leave command error:', error);
      const embed = createEmbed({
        title: '❌ Error',
        description: 'The bot could not leave the voice channel.',
        color: '#FF0000',
      });
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
