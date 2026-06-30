'use strict';
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

const DEFAULT_DATA = {
  tickets: {},        // channelId -> ticket object
  ticketCounter: 0,
  stats: {
    totalOpened: 0,
    totalClosed: 0,
    totalDurationMs: 0,
    byPriority: { dusuk: 0, orta: 0, acil: 0 },
    closerLeaderboard: {},
    ratings: [],
  },
  blacklist: {},      // userId -> { reason, addedAt }
  panelSettings: {
    color: 0x5865F2,
    title: '🎟️ Destek Merkezi',
    description: '**Merhaba!** Aşağıdaki menüden uygun kategoriyi seçerek destek talebi oluşturabilirsin.\n\n**📌 Lütfen dikkat:**\n> • Gereksiz ticket açmaktan kaçının\n> • Sorununuzu kısaca ama açıkça belirtin\n> • Ekip üyelerimiz en kısa sürede size dönecektir\n\n**🕐 Çalışma Saatleri:** Destek ekibimiz mümkün olan en kısa sürede geri dönecektir.',
  },
  openPanelMessage: null, // { channelId, messageId }
  userOpenTickets: {},    // userId -> channelId
};

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    // Merge missing keys from default
    for (const key of Object.keys(DEFAULT_DATA)) {
      if (data[key] === undefined) data[key] = DEFAULT_DATA[key];
    }
    if (!data.stats.byPriority) data.stats.byPriority = { dusuk: 0, orta: 0, acil: 0 };
    if (!data.stats.closerLeaderboard) data.stats.closerLeaderboard = {};
    if (!data.stats.ratings) data.stats.ratings = [];
    if (!data.userOpenTickets) data.userOpenTickets = {};
    return data;
  } catch (e) {
    console.error('[storage] load error:', e);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function save(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[storage] save error:', e);
  }
}

function get() {
  return load();
}

function update(fn) {
  const data = load();
  fn(data);
  save(data);
}

module.exports = { get, update };
