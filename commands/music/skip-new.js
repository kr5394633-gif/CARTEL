const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),
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

      await musicPlayer.skipSong(interaction.guildId);

      return interaction.editReply({
        content: '⏭️ Song skipped!',
      });
    } catch (error) {
      console.error('Error in skip command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
