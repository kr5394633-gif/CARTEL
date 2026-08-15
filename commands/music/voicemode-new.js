const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mode')
    .setDescription('Set voice mode')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Voice mode type')
        .setRequired(true)
        .addChoices(
          { name: 'Default', value: 'default' },
          { name: 'None', value: 'none' },
          { name: 'Push to Talk', value: 'ptt' },
          { name: 'Voice Activity', value: 'voiceactivity' }
        )
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const mode = interaction.options.getString('type');
      musicPlayer.setVoiceMode(interaction.guildId, mode);

      return interaction.editReply({
        content: `🎤 Voice Mode set to **${mode}**`,
      });
    } catch (error) {
      console.error('Error in mode command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
