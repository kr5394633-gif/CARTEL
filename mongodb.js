const { MongoClient } = require('mongodb');
const config = require('./config-music.json');

let client;

if (config.mongodbUri) {
  client = new MongoClient(config.mongodbUri);
} else {
  console.warn('⚠️ MongoDB URI is not defined. Playlist and autoplay features will be disabled.');
}

async function connectToDatabase() {
  try {
    if (!client) {
      console.log('ℹ️ Skipping MongoDB connection (URI not defined)');
      return;
    }

    await client.connect();
    console.log('✅ Connected to MongoDB');
  } catch (e) {
    console.error('❌ Failed to connect to MongoDB:', e.message);
  }
}

const db = client ? client.db('PrimeMusicSSRR') : null;
const playlistCollection = db ? db.collection('SongPlayLists') : null;
const autoplayCollection = db ? db.collection('AutoplaySettings') : null;
const languageCollection = db ? db.collection('GuildLanguages') : null;

function getLanguageCollection() {
  return languageCollection;
}

module.exports = {
  connectToDatabase,
  playlistCollection,
  autoplayCollection,
  getLanguageCollection
};
