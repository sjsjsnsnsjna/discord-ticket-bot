'use strict';
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

function ticketActionButtons(ticketId, claimed = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_close_${ticketId}`)
      .setLabel('🔒 Kapat')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket_claim_${ticketId}`)
      .setLabel('🙋 Sahiplen')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(claimed),
    new ButtonBuilder()
      .setCustomId(`ticket_adduser_${ticketId}`)
      .setLabel('➕ Kullanıcı Ekle')
      .setStyle(ButtonStyle.Success),
  );
}

function closeConfirmButtons(ticketId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_close_confirm_${ticketId}`)
      .setLabel('✅ Evet, Kapat')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket_close_cancel_${ticketId}`)
      .setLabel('❌ İptal')
      .setStyle(ButtonStyle.Secondary),
  );
}

function categorySelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket_category_select')
      .setPlaceholder('📂 Destek kategorisi seç...')
      .addOptions([
        { label: '🛠️ Genel Destek', description: 'Genel sorular ve teknik yardım', value: 'genel' },
        { label: '💳 Satın Alma / Fatura', description: 'Ödeme, fatura ve satın alma işlemleri', value: 'satin' },
        { label: '🚩 Sorun Bildir', description: 'Bug, hata veya sorun bildirimi', value: 'sorun' },
      ]),
  );
}

function satisfactionButtons(ticketId) {
  return new ActionRowBuilder().addComponents(
    ...[1, 2, 3, 4, 5].map(n =>
      new ButtonBuilder()
        .setCustomId(`rating_${n}_${ticketId}`)
        .setLabel(`${'⭐'.repeat(n)}`)
        .setStyle(ButtonStyle.Secondary),
    ),
  );
}

module.exports = { ticketActionButtons, closeConfirmButtons, categorySelectMenu, satisfactionButtons };
