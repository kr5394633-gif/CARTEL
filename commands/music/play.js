const { SlashCommandBuilder } = require('discord.js');
const { checkVoiceChannel } = require('../../utils/voiceChannelCheck');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');
const { getLang } = require('../../utils/languageLoader');
const { getLavalinkManager } = require('../../lavalink');

const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song from YouTube, Spotify, or search query')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('Song name, URL, or Spotify link')
      .setRequired(true)
  );

module.exports = {
  data,
  run: async (client, interaction) => {
    try {
      await safeDeferReply(interaction);
      const lang = await getLang(interaction.guildId);
      const query = interaction.options.getString('query');
      
      const voiceCheck = await checkVoiceChannel(interaction);
      if (!voiceCheck.allowed) {
        return interaction.editReply(`❌ ${voiceCheck.error}`);
      }

      const manager = getLavalinkManager();
      const riffy = manager.getRiffy();
      
      let player = riffy.players.get(interaction.guildId);
      if (!player) {
        player = riffy.createPlayer({
          guildId: interaction.guildId,
          voiceChannelId: voiceCheck.voiceChannel.id,
          textChannelId: interaction.channelId,
          deaf: true,
        });
        player.data = { channel: interaction.channel };
      }

      if (!player.connected) {
        await player.connect();
      }

      const result = await riffy.resolve({ query, requester: interaction.user });
      
      if (!result || !result.tracks.length) {
        return interaction.editReply('❌ No results found');
      }

      const track = result.tracks[0];
      player.queue.add(track);
      
      if (!player.playing && !player.paused) {
        await player.play();
      }

      return interaction.editReply(`✅ Added: **${track.title}** to queue`);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  }
};
