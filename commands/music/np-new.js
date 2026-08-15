const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel } = require('../../utils/voiceChannelCheck');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');
const { getLavalinkManager } = require('../../lavalink');

const data = new SlashCommandBuilder()
  .setName('np')
  .setDescription('Show the currently playing track');

module.exports = {
  data,
  run: async (client, interaction) => {
    try {
      await safeDeferReply(interaction);
      
      const manager = getLavalinkManager();
      const player = manager.getRiffy().players.get(interaction.guildId);
      
      if (!player?.current) {
        return interaction.editReply('❌ No music is playing');
      }

      const track = player.current;
      const position = player.position;
      const duration = track.duration;
      const progress = Math.round((position / duration) * 20);
      
      const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
      const currentTime = formatDuration(position);
      const totalTime = formatDuration(duration);

      const embed = {
        description: `🎵 **${track.title}**\nBy ${track.author}\n\n[${bar}]\n\`${currentTime} / ${totalTime}\``
      };

      return interaction.editReply({ content: '', embeds: [embed] });
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  }
};

function formatDuration(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
