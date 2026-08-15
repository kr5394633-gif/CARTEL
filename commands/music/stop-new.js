const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and leave the voice channel'),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const status = await musicPlayer.getPlayerStatus(interaction.guildId);
      
      if (!status.isConnected && !status.isPlaying) {
        return interaction.editReply({
          content: '❌ The bot is not playing anything!',
          ephemeral: true,
        });
      }

      await musicPlayer.stopMusic(interaction.guildId);

      return interaction.editReply({
        content: '⏹️ Music stopped and bot left the voice channel.',
      });
    } catch (error) {
      console.error('Error in stop command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
