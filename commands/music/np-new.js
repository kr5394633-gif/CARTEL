const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('np')
    .setDescription('Show the currently playing song'),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const status = await musicPlayer.getPlayerStatus(interaction.guildId);
      
      if (!status.isPlaying) {
        return interaction.editReply({
          content: '❌ No song is currently playing!',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor('#FF2E4D')
        .setTitle('🎵 Now Playing')
        .setDescription('Music is currently playing in this server')
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in np command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
