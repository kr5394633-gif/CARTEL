const { SlashCommandBuilder } = require('discord.js');
const musicPlayer = require('../../utils/musicPlayer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the music volume')
    .addIntegerOption(option =>
      option.setName('level')
        .setDescription('Volume level (1-10000)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10000)
    ),
  async execute(interaction) {
    try {
      await interaction.deferReply();

      const volume = interaction.options.getInteger('level');
      
      musicPlayer.setVolume(interaction.guildId, volume);
      musicPlayer.applyVolumeEffect(interaction.guildId);

      // Create visual volume bar (normalize to 100% for display)
      const percentage = (volume / 10000) * 100;
      const barLength = Math.floor(percentage / 5);
      const volumeBar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);

      const modes = musicPlayer.getModes(interaction.guildId);
      let effectText = '';
      if (modes.systemMode) effectText = ' ⚡ (System Mode Active)';
      else if (modes.blastMode) effectText = ' 🔥 (Blast Mode Active)';

      return interaction.editReply({
        content: `🔊 Volume set to **${volume}/10000** (${Math.round(percentage)}%)${effectText}\n[${volumeBar}]`,
      });
    } catch (error) {
      console.error('Error in volume command:', error);
      return interaction.editReply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
