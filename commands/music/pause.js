const { SlashCommandBuilder } = require('discord.js');
const { getMusicPlayer } = require('../../utils/musicPlayer');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),

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

      queue.node.setPaused(true);

      const embed = createEmbed({
        title: '⏸️ Paused',
        description: `**${queue.currentTrack.title}** has been paused.`,
      });
      interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createEmbed({
        title: '❌ Error',
        description: 'An error occurred while pausing the song.',
        color: '#FF0000',
      });
      interaction.editReply({ embeds: [embed] });
    }
  },
};
