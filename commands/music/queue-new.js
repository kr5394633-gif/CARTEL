const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel } = require('../../utils/voiceChannelCheck');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');
const { getLang } = require('../../utils/languageLoader');
const { getLavalinkManager } = require('../../lavalink');

const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Show the current music queue');

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

      let description = `**Now Playing:**\n🎵 **${player.current.title}**\n\n`;
      
      if (player.queue.length > 0) {
        description += '**Queue:**\n';
        player.queue.slice(0, 10).forEach((track, i) => {
          description += `${i + 1}. **${track.title}** (${formatDuration(track.duration)})\n`;
        });
        
        if (player.queue.length > 10) {
          description += `\n*... and ${player.queue.length - 10} more*`;
        }
      } else {
        description += '**Queue is empty**';
      }

      return interaction.editReply({
        content: description,
        components: []
      });
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  }
};

function formatDuration(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
