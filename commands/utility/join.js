const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { getLavalinkManager } = require('../../lavalink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join your current voice channel')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Voice channel to join')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const targetChannel = interaction.options.getChannel('channel') || interaction.member?.voice?.channel;

      if (!targetChannel || !targetChannel.isVoiceBased()) {
        const embed = createEmbed({
          title: '❌ Not in a voice channel',
          description: 'Join a voice channel or specify one with `/join #voice-channel`.',
          color: '#FF0000',
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const manager = getLavalinkManager();
      const riffy = manager.getRiffy();
      
      let player = riffy.players.get(interaction.guildId);
      if (!player) {
        player = riffy.createPlayer({
          guildId: interaction.guildId,
          voiceChannelId: targetChannel.id,
          textChannelId: interaction.channelId,
          deaf: true,
        });
      }

      if (!player.connected) {
        await player.connect();
      }

      const embed = createEmbed({
        title: '✅ Joined voice channel',
        description: `Connected to **${targetChannel.name}**.`,
        color: '#57F287',
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Join command error:', error);
      const embed = createEmbed({
        title: '❌ Join failed',
        description: 'The bot could not join that voice channel.',
        color: '#FF0000',
      });
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
