const { SlashCommandBuilder } = require('discord.js');
const { getMusicPlayer } = require('../../utils/musicPlayer');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and clear the queue'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const player = getMusicPlayer();
      const queue = player.nodes.get(interaction.guild);

      if (!queue || !queue.isPlaying()) {
        const embed = createEmbed({
          title: '❌ Error',
          description: 'No song is currently playing.',
          color: '#FF0000',
        });
        return interaction.editReply({ embeds: [embed] });
      }

      queue.delete();

      const embed = createEmbed({
        title: '⏹️ Stopped',
        description: 'The music has been stopped and the queue has been cleared.',
        color: '#FF0000',
      });
      interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createEmbed({
        title: '❌ Error',
        description: 'An error occurred while stopping the music.',
        color: '#FF0000',
      });
      interaction.editReply({ embeds: [embed] });
    }
  },
};
