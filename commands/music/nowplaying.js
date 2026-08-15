const { SlashCommandBuilder } = require('discord.js');
const { getMusicPlayer } = require('../../utils/musicPlayer');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('np')
    .setDescription('Show the currently playing track'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const player = getMusicPlayer();
      const queue = player.nodes.get(interaction.guild);

      if (!queue || !queue.currentTrack) {
        const embed = createEmbed({
          title: '🎵 Now Playing',
          description: 'No track is currently playing.',
          color: '#FF0000',
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const track = queue.currentTrack;
      const embed = createEmbed({
        title: '🎵 Now Playing',
        description: `**${track.title}**`,
        fields: [
          { name: 'Author', value: track.author || 'Unknown', inline: true },
          { name: 'Duration', value: track.duration ? `${Math.floor(track.duration / 1000)}s` : 'Live', inline: true },
          { name: 'Requested by', value: track.requestedBy?.toString() || 'Unknown', inline: true },
        ],
      });

      if (track.thumbnail) {
        embed.setThumbnail(track.thumbnail);
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Now playing command error:', error);
      const embed = createEmbed({
        title: '❌ Error',
        description: 'Could not fetch the current track.',
        color: '#FF0000',
      });
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
