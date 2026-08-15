const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused song'),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const status = await musicPlayer.getPlayerStatus(interaction.guildId);
      
      if (!status.isPaused) {
        return interaction.editReply({
          content: '❌ No paused song to resume!',
          ephemeral: true,
        });
      }

      await musicPlayer.resumeMusic(interaction.guildId);

      return interaction.editReply({
        content: '▶️ Music resumed!',
      });
    } catch (error) {
      console.error('Error in resume command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
