const { SlashCommandBuilder, ChannelType } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or add it to the queue')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Song name or YouTube URL')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Check if user is in voice channel
      if (!interaction.member.voice.channel) {
        return interaction.editReply({
          content: '❌ You need to join a voice channel first!',
          ephemeral: true,
        });
      }

      const voiceChannel = interaction.member.voice.channel;
      const query = interaction.options.getString('query');

      // Play the song
      const info = await musicPlayer.playSong(
        interaction.guildId,
        voiceChannel,
        query
      );

      return interaction.editReply({
        content: `🎵 Now playing: **${info.title}**\n🎵 Joined: <#${voiceChannel.id}>`,
      });
    } catch (error) {
      console.error('Error in play command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
