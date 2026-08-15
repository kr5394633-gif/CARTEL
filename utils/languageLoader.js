const fs = require('fs');
const path = require('path');
const { getLanguageCollection } = require('../mongodb');

let cachedLanguages = {};
let globalDefaultLanguage = 'en';

function loadLanguageSync(lang = 'en') {
  if (cachedLanguages[lang]) return cachedLanguages[lang];
  
  try {
    const langFile = path.join(__dirname, `../languages/${lang}.json`);
    if (fs.existsSync(langFile)) {
      const data = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
      cachedLanguages[lang] = data;
      return data;
    }
  } catch (e) {
    console.error(`Failed to load language ${lang}:`, e);
  }
  
  return cachedLanguages['en'] || { console: {}, music: {} };
}

async function getLang(guildId) {
  try {
    if (!guildId) return loadLanguageSync();
    
    const collection = getLanguageCollection();
    if (!collection) return loadLanguageSync();
    
    const doc = await collection.findOne({ guildId });
    return loadLanguageSync(doc?.language || globalDefaultLanguage);
  } catch (e) {
    return loadLanguageSync();
  }
}

function getLangSync(lang = null) {
  return loadLanguageSync(lang || globalDefaultLanguage);
}

function getAvailableLanguages() {
  const langDir = path.join(__dirname, '../languages');
  if (!fs.existsSync(langDir)) return ['en'];
  
  return fs.readdirSync(langDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

async function setGuildLanguage(guildId, lang) {
  try {
    const collection = getLanguageCollection();
    if (collection) {
      await collection.updateOne(
        { guildId },
        { $set: { language: lang } },
        { upsert: true }
      );
    }
  } catch (e) {
    console.error('Failed to set guild language:', e);
  }
}

async function getGuildLanguage(guildId) {
  try {
    const collection = getLanguageCollection();
    if (collection) {
      const doc = await collection.findOne({ guildId });
      return doc?.language || globalDefaultLanguage;
    }
  } catch (e) {
    console.error('Failed to get guild language:', e);
  }
  return globalDefaultLanguage;
}

function getGlobalDefaultLanguage() {
  return globalDefaultLanguage;
}

module.exports = {
  getLang,
  getLangSync,
  loadLanguageSync,
  getAvailableLanguages,
  setGuildLanguage,
  getGuildLanguage,
  getGlobalDefaultLanguage
};
