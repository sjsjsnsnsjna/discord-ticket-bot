'use strict';
const {
  ChannelType, PermissionFlagsBits, AttachmentBuilder,
} = require('discord.js');
const storage = require('../storage');
const embeds = require('./embeds');
const buttons = require('./buttons');

const PRIORITY_CHANNEL_PREFIX = { dusuk: '🟢', orta: '🟡', acil: '🔴' };

async function createTicketChannel(guild, opener, category, subject, priority) {
  const data = storage.get();
  const number = data.ticketCounter + 1;
  const prefix = PRIORITY_CHANNEL_PREFIX[priority] || '🟢';
  const safeName = opener.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'kullanici';
  const channelName = `${prefix}ticket-${safeName}-${number}`;

  const staffRoleId = process.env.STAFF_ROLE_ID;
  const categoryId = process.env.TICKET_CATEGORY_ID;

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: opener.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
  ];

  if (staffRoleId) {
    permissionOverwrites.push({
      id: staffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId || null,
    topic: `Ticket #${number} | ${embeds.CATEGORY_LABELS[category]} | ${embeds.PRIORITY_META[priority]?.label} | <@${opener.id}>`,
    permissionOverwrites,
  });

  const ticket = {
    number,
    channelId: channel.id,
    channelName,
    openerId: opener.id,
    openerTag: opener.tag || opener.username,
    category,
    subject,
    priority,
    openedAt: Date.now(),
    lastActivity: Date.now(),
    claimerId: null,
    closedBy: null,
    warningPosted: false,
  };

  storage.update(d => {
    d.ticketCounter = number;
    d.tickets[channel.id] = ticket;
    d.userOpenTickets[opener.id] = channel.id;
    d.stats.totalOpened++;
    d.stats.byPriority[priority] = (d.stats.byPriority[priority] || 0) + 1;
  });

  const welcomeEmbed = embeds.ticketWelcomeEmbed(ticket, `<@${opener.id}>`);
  const actionButtons = buttons.ticketActionButtons(channel.id);

  await channel.send({ embeds: [welcomeEmbed], components: [actionButtons] });

  return channel;
}

async function closeTicket(channel, guild, closer, client) {
  const data = storage.get();
  const ticket = data.tickets[channel.id];
  if (!ticket) return;

  const transcript = await generateTranscript(channel);

  const logChannelId = process.env.LOG_CHANNEL_ID;
  if (logChannelId) {
    try {
      const logChannel = await guild.channels.fetch(logChannelId);
      if (logChannel) {
        const logEmbed = embeds.ticketClosedLogEmbed(ticket, closer, guild);
        const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), {
          name: `ticket-${ticket.number}-transcript.txt`,
        });
        await logChannel.send({ embeds: [logEmbed], files: [attachment] });
      }
    } catch (e) {
      console.error('[ticket] log channel send error:', e);
    }
  }

  // DM satisfaction survey
  const ticketId = channel.id;
  try {
    const opener = await client.users.fetch(ticket.openerId);
    if (opener) {
      const surveyEmbed = embeds.satisfactionSurveyEmbed();
      const surveyButtons = buttons.satisfactionButtons(ticketId);
      await opener.send({ embeds: [surveyEmbed], components: [surveyButtons] });
    }
  } catch (e) {
    // DMs kapalı — sessizce geç
  }

  const durationMs = Date.now() - ticket.openedAt;

  storage.update(d => {
    if (d.tickets[channel.id]) {
      d.tickets[channel.id].closedBy = closer ? closer.id : 'Otomatik Kapatma';
      d.tickets[channel.id].closedAt = Date.now();
    }
    delete d.userOpenTickets[ticket.openerId];
    d.stats.totalClosed++;
    d.stats.totalDurationMs += durationMs;
    if (closer) {
      d.stats.closerLeaderboard[closer.id] = (d.stats.closerLeaderboard[closer.id] || 0) + 1;
    }
    // Keep ticket record for stats but remove from active
    const t = d.tickets[channel.id];
    if (t) {
      if (!d.closedTickets) d.closedTickets = {};
      d.closedTickets[channel.id] = t;
      delete d.tickets[channel.id];
    }
  });

  await new Promise(r => setTimeout(r, 3000));
  try {
    await channel.delete('Ticket kapatıldı');
  } catch (e) {
    console.error('[ticket] channel delete error:', e);
  }
}

async function generateTranscript(channel) {
  const lines = [];
  lines.push(`=== TICKET TRANSCRIPT ===`);
  lines.push(`Kanal: ${channel.name}`);
  lines.push(`Oluşturulma: ${new Date().toLocaleString('tr-TR')}`);
  lines.push('='.repeat(40));

  try {
    let lastId;
    let allMessages = [];
    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const batch = await channel.messages.fetch(options);
      if (batch.size === 0) break;
      allMessages = allMessages.concat([...batch.values()]);
      lastId = batch.last()?.id;
      if (batch.size < 100) break;
    }
    allMessages.reverse();

    for (const msg of allMessages) {
      const ts = msg.createdAt.toLocaleString('tr-TR');
      const author = `${msg.author.username}#${msg.author.discriminator || '0000'}`;
      const content = msg.content || (msg.embeds.length ? '[Embed]' : '[Dosya/Ek]');
      lines.push(`[${ts}] ${author}: ${content}`);
      if (msg.attachments.size > 0) {
        for (const att of msg.attachments.values()) {
          lines.push(`  📎 ${att.url}`);
        }
      }
    }
  } catch (e) {
    lines.push('[Mesaj geçmişi alınamadı]');
  }

  return lines.join('\n');
}

module.exports = { createTicketChannel, closeTicket };
