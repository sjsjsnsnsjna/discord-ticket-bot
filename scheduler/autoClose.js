'use strict';
const storage = require('../storage');
const embeds = require('../helpers/embeds');
const ticketHelper = require('../helpers/ticket');

const INACTIVITY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 saat
const WARNING_GRACE_MS = 60 * 60 * 1000;              // 1 saat
const CHECK_INTERVAL_MS = 15 * 60 * 1000;             // 15 dakika

function startAutoClose(client) {
  setInterval(() => runCheck(client), CHECK_INTERVAL_MS);
  console.log('[autoClose] Otomatik kapatma zamanlayıcısı başlatıldı.');
}

async function runCheck(client) {
  const data = storage.get();
  const now = Date.now();

  for (const [channelId, ticket] of Object.entries(data.tickets)) {
    try {
      const lastActive = ticket.lastActivity || ticket.openedAt;
      const inactiveDuration = now - lastActive;

      if (!ticket.warningPosted) {
        if (inactiveDuration >= INACTIVITY_THRESHOLD_MS) {
          // Post warning
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (!channel) {
            cleanupTicket(channelId);
            continue;
          }
          const warningEmbed = embeds.autoCloseWarningEmbed(ticket.openerId);
          await channel.send({ embeds: [warningEmbed] });

          storage.update(d => {
            if (d.tickets[channelId]) {
              d.tickets[channelId].warningPosted = true;
              d.tickets[channelId].warningPostedAt = now;
            }
          });
          console.log(`[autoClose] Uyarı gönderildi: ${channelId}`);
        }
      } else {
        // Warning already posted — check grace period
        const warningAge = now - (ticket.warningPostedAt || ticket.openedAt);
        if (warningAge >= WARNING_GRACE_MS) {
          // Auto-close
          const channel = await client.channels.fetch(channelId).catch(() => null);
          if (!channel) {
            cleanupTicket(channelId);
            continue;
          }
          console.log(`[autoClose] Otomatik kapatılıyor: ${channelId}`);
          // Mark as auto-close before closing
          storage.update(d => {
            if (d.tickets[channelId]) {
              d.tickets[channelId].closedBy = 'Otomatik Kapatma';
            }
          });
          await ticketHelper.closeTicket(channel, channel.guild, null, client);
        }
      }
    } catch (e) {
      console.error(`[autoClose] channel ${channelId} error:`, e);
    }
  }
}

function cleanupTicket(channelId) {
  storage.update(d => {
    const ticket = d.tickets[channelId];
    if (ticket) {
      delete d.userOpenTickets[ticket.openerId];
      delete d.tickets[channelId];
    }
  });
}

// Called from messageCreate event to update lastActivity
function updateActivity(channelId) {
  storage.update(d => {
    if (d.tickets[channelId]) {
      d.tickets[channelId].lastActivity = Date.now();
      // Reset warning if user replied
      if (d.tickets[channelId].warningPosted) {
        d.tickets[channelId].warningPosted = false;
        d.tickets[channelId].warningPostedAt = null;
      }
    }
  });
}

module.exports = { startAutoClose, updateActivity };
