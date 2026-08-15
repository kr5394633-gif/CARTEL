const { SlashCommandBuilder } = require('discord.js');
const { getMusicPlayer } = require('../../utils/musicPlayer');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for a song and play the first result')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Song name or URL to search for')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const player = getMusicPlayer();
      const query = interaction.options.getString('query');
      const voiceChannel = interaction.member?.voice?.channel;

      if (!voiceChannel) {
        const embed = createEmbed({
          title: '❌ Join a voice channel',
          description: 'You must be in a voice channel before searching music.',
          color: '#FF0000',
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const queue = player.nodes.create(interaction.guild);
      if (!queue.connection) {
        queue.connect(voiceChannel);
      }

      queue.metadata = { channel: interaction.channel };
      const result = await queue.play(query, { searchEngine: 'auto' });
      const track = result.track;

      const embed = createEmbed({
        title: '🎵 Added to Queue',
        description: `**${track.title}**`,
        fields: [
          { name: 'Author', value: track.author || 'Unknown', inline: true },
          { name: 'Duration', value: track.duration ? `${Math.floor(track.duration / 1000)}s` : 'Live', inline: true },
        ],
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Search command error:', error);
      const embed = createEmbed({
        title: '❌ Search failed',
        description: 'No track could be found for that query.',
        color: '#FF0000',
      });
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
