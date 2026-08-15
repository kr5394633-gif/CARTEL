const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggle Loop mode - Song repeats forever'),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const modes = musicPlayer.getModes(interaction.guildId);
      const newState = !modes.loopMode;
      musicPlayer.setLoopMode(interaction.guildId, newState);

      return interaction.editReply({
        content: newState
          ? '🔄 **LOOP MODE ENABLED**\nSong will repeat forever!'
          : '⛔ Loop Mode disabled',
      });
    } catch (error) {
      console.error('Error in loop command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
