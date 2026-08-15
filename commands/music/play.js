const { SlashCommandBuilder } = require('discord.js');
const { getMusicPlayer } = require('../../utils/musicPlayer');
const { createEmbed } = require('../../utils/embeds');
const { logger } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube or search')
    .addStringOption((option) =>
      option.setName('query').setDescription('Song name or YouTube URL').setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const player = getMusicPlayer();
      const query = interaction.options.getString('query');
      const voiceChannel = interaction.member?.voice?.channel;

      if (!voiceChannel) {
        const embed = createEmbed({
          title: '❌ Error',
          description: 'You must be in a voice channel to play music.',
          color: '#FF0000',
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const queue = player.nodes.create(interaction.guild);
      if (!queue.connection) {
        queue.connect(voiceChannel);
      }

      queue.metadata = { channel: interaction.channel };

      try {
        const { track } = await queue.play(query, {
          requestedBy: interaction.user,
          searchEngine: 'auto',
        });

        const embed = createEmbed({
          title: '🎵 Track Added',
          description: `**${track.title}**`,
          fields: [
            { name: 'Duration', value: track.duration ? `${Math.floor(track.duration / 1000)}s` : 'Live', inline: true },
            { name: 'Queue Position', value: `${queue.tracks.length}`, inline: true },
          ],
        });
        interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger.error('Error playing track:', error);
        const embed = createEmbed({
          title: '❌ Error',
          description: 'Could not find or play that track. Try a different search query.',
          color: '#FF0000',
        });
        interaction.editReply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error('Play command error:', error);
      const embed = createEmbed({
        title: '❌ Error',
        description: 'An error occurred while processing your request.',
        color: '#FF0000',
      });
      interaction.editReply({ embeds: [embed] });
    }
  },
};
