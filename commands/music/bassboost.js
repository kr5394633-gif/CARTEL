const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bassboost')
    .setDescription('Toggle Bass Boost effect'),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const modes = musicPlayer.getModes(interaction.guildId);
      const newState = !modes.bassBoost;
      musicPlayer.setBassBoost(interaction.guildId, newState);

      return interaction.editReply({
        content: newState
          ? `🎸 **BASS BOOST ENABLED**\n*Heavy bass incoming!*`
          : '⛔ Bass Boost disabled',
      });
    } catch (error) {
      console.error('Error in bassboost command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
