'use strict';
const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary: 0x5865F2,   // Discord blurple
  success: 0x57F287,
  danger: 0xED4245,
  warning: 0xFEE75C,
  info: 0x00B0F4,
  dark: 0x2B2D31,
};

const PRIORITY_META = {
  dusuk: { label: '🟢 Düşük', color: COLORS.success },
  orta:  { label: '🟡 Orta',  color: COLORS.warning },
  acil:  { label: '🔴 Acil',  color: COLORS.danger  },
};

const CATEGORY_LABELS = {
  genel:    '🛠️ Genel Destek',
  satin:    '💳 Satın Alma / Fatura',
  sorun:    '🚩 Sorun Bildir',
};

function panelEmbed(settings, guild) {
  const iconURL = guild.iconURL({ size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
  return new EmbedBuilder()
    .setColor(settings.color)
    .setTitle(settings.title)
    .setDescription(settings.description)
    .setThumbnail(iconURL)
    .setFooter({ text: `${guild.name} • Destek Sistemi`, iconURL })
    .setTimestamp();
}

function ticketWelcomeEmbed(ticket, opener) {
  const priority = PRIORITY_META[ticket.priority] || PRIORITY_META.orta;
  return new EmbedBuilder()
    .setColor(priority.color)
    .setTitle('🎟️ Destek Talebi Oluşturuldu')
    .setDescription(`Merhaba ${opener}! Destek talebiniz alındı, ekibimiz en kısa sürede size geri dönecektir.`)
    .addFields(
      { name: '📂 Kategori',    value: CATEGORY_LABELS[ticket.category] || ticket.category, inline: true },
      { name: '⚡ Öncelik',     value: priority.label, inline: true },
      { name: '📝 Konu',        value: ticket.subject || '—', inline: false },
      { name: '👤 Açan Kişi',   value: `<@${ticket.openerId}>`, inline: true },
      { name: '🕐 Açılış Saati', value: `<t:${Math.floor(ticket.openedAt / 1000)}:F>`, inline: true },
    )
    .setFooter({ text: `Ticket #${ticket.number}` })
    .setTimestamp();
}

function closeConfirmEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🔒 Ticket Kapatılıyor')
    .setDescription('Bu destek talebini kapatmak istediğinden emin misin?\n\nKapatıldıktan sonra kanal silinecek ve transcript log kanalına gönderilecektir.')
    .setFooter({ text: 'İşlemi onaylamak için aşağıdaki butona bas.' });
}

function ticketClosedLogEmbed(ticket, closer, guild) {
  const priority = PRIORITY_META[ticket.priority] || PRIORITY_META.orta;
  const durationMs = Date.now() - ticket.openedAt;
  const durationStr = formatDuration(durationMs);

  return new EmbedBuilder()
    .setColor(COLORS.dark)
    .setTitle('📋 Ticket Kapatıldı')
    .addFields(
      { name: '🎫 Ticket', value: `#${ticket.number} — ${ticket.channelName}`, inline: true },
      { name: '📂 Kategori', value: CATEGORY_LABELS[ticket.category] || ticket.category, inline: true },
      { name: '⚡ Öncelik', value: priority.label, inline: true },
      { name: '📝 Konu', value: ticket.subject || '—', inline: false },
      { name: '👤 Açan', value: `<@${ticket.openerId}>`, inline: true },
      { name: '🔒 Kapatan', value: closer ? `<@${closer.id}>` : ticket.closedBy || 'Sistem', inline: true },
      { name: '🙋 Sahiplenen', value: ticket.claimerId ? `<@${ticket.claimerId}>` : '—', inline: true },
      { name: '⏱️ Süre', value: durationStr, inline: true },
      { name: '📅 Açılış', value: `<t:${Math.floor(ticket.openedAt / 1000)}:F>`, inline: true },
      { name: '📅 Kapanış', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    )
    .setFooter({ text: ticket.closedBy === 'Otomatik Kapatma' ? '🤖 Otomatik Kapatma' : '✋ Manuel Kapatma' })
    .setTimestamp();
}

function statsEmbed(stats) {
  const avgDuration = stats.totalClosed > 0
    ? formatDuration(stats.totalDurationMs / stats.totalClosed)
    : '—';

  const avgRating = stats.ratings.length > 0
    ? (stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length).toFixed(1)
    : '—';

  const leaderboard = Object.entries(stats.closerLeaderboard)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count], i) => `${['🥇','🥈','🥉','4️⃣','5️⃣'][i]} <@${id}> — **${count}** ticket`)
    .join('\n') || 'Henüz veri yok.';

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('📊 Ticket İstatistikleri')
    .addFields(
      { name: '📬 Toplam Açılan', value: `${stats.totalOpened}`, inline: true },
      { name: '✅ Toplam Kapatılan', value: `${stats.totalClosed}`, inline: true },
      { name: '⏱️ Ort. Çözüm Süresi', value: avgDuration, inline: true },
      { name: '⚡ Öncelik Dağılımı',
        value: `🟢 Düşük: **${stats.byPriority.dusuk || 0}** | 🟡 Orta: **${stats.byPriority.orta || 0}** | 🔴 Acil: **${stats.byPriority.acil || 0}**`,
        inline: false },
      { name: '⭐ Ortalama Memnuniyet', value: avgRating !== '—' ? `${avgRating} / 5 (${stats.ratings.length} oy)` : '—', inline: true },
      { name: '🏆 Personel Sıralaması', value: leaderboard, inline: false },
    )
    .setTimestamp();
}

function autoCloseWarningEmbed(opener) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('⚠️ Otomatik Kapatma Uyarısı')
    .setDescription(`${opener ? `<@${opener}>` : ''} Bu ticket **1 saat** içinde otomatik olarak kapatılacak.\n\nHâlâ yardıma ihtiyacın varsa bu kanalda bir mesaj yaz.`)
    .setTimestamp();
}

function satisfactionSurveyEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('⭐ Memnuniyet Anketi')
    .setDescription('Destek hizmetimizi nasıl değerlendirirsin?\n\nAşağıdan bir puan seçerek bize geri bildirimde bulun:')
    .setFooter({ text: 'Bu anket 24 saat içinde sona erecektir.' });
}

function ratingRecordedEmbed(userId, rating) {
  const stars = '⭐'.repeat(rating);
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('📊 Anket Sonucu')
    .setDescription(`<@${userId}> destek hizmetini **${stars} (${rating}/5)** olarak değerlendirdi.`)
    .setTimestamp();
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} dakika`;
  return `${hours} saat ${minutes} dakika`;
}

module.exports = {
  COLORS, PRIORITY_META, CATEGORY_LABELS,
  panelEmbed, ticketWelcomeEmbed, closeConfirmEmbed,
  ticketClosedLogEmbed, statsEmbed, autoCloseWarningEmbed,
  satisfactionSurveyEmbed, ratingRecordedEmbed, formatDuration,
};
