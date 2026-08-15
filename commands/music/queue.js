const { SlashCommandBuilder } = require('discord.js');
const { getMusicPlayer } = require('../../utils/musicPlayer');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),

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

      const currentTrack = queue.currentTrack;
      const tracks = queue.tracks.slice(0, 10);

      let description = `**Currently Playing:**\n🎵 **${currentTrack.title}**\n\n`;

      if (tracks.length > 0) {
        description += '**Up Next:**\n';
        tracks.forEach((track, idx) => {
          description += `${idx + 1}. **${track.title}** (${track.duration ? Math.floor(track.duration / 1000) + 's' : 'Live'})\n`;
        });

        if (queue.tracks.length > 10) {
          description += `\n*... and ${queue.tracks.length - 10} more songs*`;
        }
      } else {
        description += '**No songs in queue after this one.**';
      }

      const embed = createEmbed({
        title: '🎵 Music Queue',
        description: description,
        fields: [
          { name: 'Total Tracks', value: `${queue.tracks.length + 1}`, inline: true },
          { name: 'Total Duration', value: `${Math.floor((queue.estimatedPlayingTime + currentTrack.duration) / 1000)}s`, inline: true },
        ],
      });

      interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = createEmbed({
        title: '❌ Error',
        description: 'An error occurred while fetching the queue.',
        color: '#FF0000',
      });
      interaction.editReply({ embeds: [embed] });
    }
  },
};
