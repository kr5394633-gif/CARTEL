const { SlashCommandBuilder } = require('discord.js');
const { getMusicPlayer } = require('../../utils/musicPlayer');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip to the next song in the queue'),

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

      if (queue.tracks.length === 0) {
        const embed = createEmbed({
          title: '❌ Error',
          description: 'There are no more songs in the queue.',
          color: '#FF0000',
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const skipped = queue.currentTrack;
      queue.node.skip();

      const embed = createEmbed({
        title: '⏭️ Skipped',
        description: `**${skipped.title}** has been skipped.`,
      });
      interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createEmbed({
        title: '❌ Error',
        description: 'An error occurred while skipping the song.',
        color: '#FF0000',
      });
      interaction.editReply({ embeds: [embed] });
    }
  },
};
