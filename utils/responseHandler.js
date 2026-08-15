const { ContainerBuilder, MessageFlags } = require('discord.js');

async function safeDeferReply(interaction) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Defer reply error:', e);
    return false;
  }
}

async function safeDeferUpdate(interaction) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
      return true;
    }
    return false;
  } catch (e) {
    console.error('Defer update error:', e);
    return false;
  }
}

function sendErrorResponse(interaction, title, description) {
  const card = new ContainerBuilder()
    .addTextDisplayComponents((t) => t.setContent(`## ❌ ${title}`))
    .addTextDisplayComponents((t) => t.setContent(description));
  
  return interaction.editReply({ components: [card] });
}

function sendSuccessResponse(interaction, title, description) {
  const card = new ContainerBuilder()
    .addTextDisplayComponents((t) => t.setContent(`## ✅ ${title}`))
    .addTextDisplayComponents((t) => t.setContent(description));
  
  return interaction.editReply({ components: [card] });
}

function buildPaleCard(title, sections, actionRows = []) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`## ${title}`));

  for (const section of sections) {
    container
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent(section));
  }

  if (actionRows.length) {
    for (const row of actionRows) {
      container.addActionRowComponents((ar) => {
        for (const button of row) {
          ar.addComponents(button);
        }
      });
    }
  }

  return container;
}

function sanitizeTitle(title) {
  return (title || '').replace(/[<>]/g, '').substring(0, 256);
}

function stripLeadingIcons(text) {
  return (text || '').replace(/^[🎵🎶🎸🎹🎤🎧]*\s*/gi, '').trim();
}

async function handleCommandError(interaction, error, lang = {}) {
  console.error('Command error:', error);
  
  const errorMsg = error?.message || 'Unknown error occurred';
  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: `❌ Error: ${errorMsg}`,
        flags: MessageFlags.Ephemeral 
      });
    } else {
      await interaction.editReply({ 
        content: `❌ Error: ${errorMsg}`
      });
    }
  } catch (e) {
    console.error('Failed to send error response:', e);
  }
}

function cardFromMessage(message) {
  return new ContainerBuilder()
    .addTextDisplayComponents((t) => t.setContent(message));
}

module.exports = {
  safeDeferReply,
  safeDeferUpdate,
  sendErrorResponse,
  sendSuccessResponse,
  buildPaleCard,
  sanitizeTitle,
  stripLeadingIcons,
  handleCommandError,
  cardFromMessage
};
