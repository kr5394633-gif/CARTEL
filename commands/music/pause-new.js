const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),
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

      await musicPlayer.pauseMusic(interaction.guildId);

      return interaction.editReply({
        content: '⏸️ Music paused!',
      });
    } catch (error) {
      console.error('Error in pause command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
