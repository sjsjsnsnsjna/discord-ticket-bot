'use strict';
require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { keepAlive } = require('./keepAlive');
const { handleInteraction } = require('./handlers/interactionCreate');
const { startAutoClose, updateActivity } = require('./scheduler/autoClose');

// ── Validate required env vars ──────────────────────────────────
const REQUIRED_ENV = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'OWNER_ID'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[config] Eksik zorunlu ortam değişkeni: ${key}`);
    process.exit(1);
  }
}

// ── Keep-alive web server ───────────────────────────────────────
keepAlive();

// ── Discord client ──────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ── Load commands ───────────────────────────────────────────────
client.commands = new Collection();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(__dirname, 'commands', file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// ── Deploy commands on startup ──────────────────────────────────
const { REST, Routes } = require('discord.js');

async function deployCommands() {
  try {
    const commands = [...client.commands.values()].map(c => c.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log(`[deploy] ${commands.length} komut sunucuya kaydedildi.`);
  } catch (e) {
    console.error('[deploy] Komut kaydı hatası:', e);
  }
}

// ── Events ──────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`[bot] ${client.user.tag} olarak giriş yapıldı!`);
  await deployCommands();
  startAutoClose(client);
});

client.on('interactionCreate', async interaction => {
  await handleInteraction(interaction, client);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.guild) return;
  // Update ticket last activity
  updateActivity(message.channel.id);
});

client.on('error', e => console.error('[client] error:', e));
client.on('warn', w => console.warn('[client] warn:', w));

// ── Login ───────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch(e => {
  console.error('[bot] Giriş başarısız:', e);
  process.exit(1);
});
