const { PermissionsBitField } = require('discord.js');

async function checkVoiceChannel(interaction, player = null) {
  const voiceChannel = interaction.member?.voice?.channel;
  
  if (!voiceChannel) {
    return {
      allowed: false,
      error: 'You must be in a voice channel'
    };
  }

  const botMember = interaction.guild.members.me;
  if (!botMember) {
    return {
      allowed: false,
      error: 'Bot member is not available'
    };
  }

  const permissions = botMember.permissionsIn(voiceChannel);
  if (!permissions.has(PermissionsBitField.Flags.Connect) || 
      !permissions.has(PermissionsBitField.Flags.Speak)) {
    return {
      allowed: false,
      error: 'I need Connect and Speak permissions in that voice channel'
    };
  }

  if (player && player.voiceChannelId && player.voiceChannelId !== voiceChannel.id) {
    return {
      allowed: false,
      error: `I'm already in a different voice channel`
    };
  }

  return {
    allowed: true,
    voiceChannel
  };
}

module.exports = {
  checkVoiceChannel
};
