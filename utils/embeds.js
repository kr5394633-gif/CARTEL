const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

function baseEmbed(color) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function successEmbed(title, description) {
  return baseEmbed(config.embedColors.success).setTitle(`✅ ${title}`).setDescription(description || null);
}

function warningEmbed(title, description) {
  return baseEmbed(config.embedColors.warning).setTitle(`⚠️ ${title}`).setDescription(description || null);
}

function dangerEmbed(title, description) {
  return baseEmbed(config.embedColors.danger).setTitle(`🚨 ${title}`).setDescription(description || null);
}

function infoEmbed(title, description) {
  return baseEmbed(config.embedColors.info).setTitle(`ℹ️ ${title}`).setDescription(description || null);
}

module.exports = { baseEmbed, successEmbed, warningEmbed, dangerEmbed, infoEmbed };
