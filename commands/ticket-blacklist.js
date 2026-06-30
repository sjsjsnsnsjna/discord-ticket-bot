'use strict';
const { SlashCommandBuilder } = require('discord.js');
const storage = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-blacklist')
    .setDescription('Ticket kara liste yönetimi. (Sadece sunucu sahibi)')
    .addSubcommand(sub =>
      sub.setName('ekle')
        .setDescription('Kullanıcıyı kara listeye ekle')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kara listeye eklenecek kullanıcı').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Sebep (opsiyonel)').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('kaldir')
        .setDescription('Kullanıcıyı kara listeden kaldır')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kara listeden çıkarılacak kullanıcı').setRequired(true))),

  async execute(interaction) {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('kullanici');

    try {
      if (sub === 'ekle') {
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        storage.update(d => {
          d.blacklist[target.id] = { reason, addedAt: Date.now(), addedBy: interaction.user.id };
        });

        await interaction.reply({
          content: `✅ **${target.username}** kara listeye eklendi.\n📝 Sebep: ${reason}`,
          ephemeral: true,
        });

        // Log to log channel
        await logBlacklistAction(interaction, target, 'eklendi', reason);
      } else if (sub === 'kaldir') {
        const data = storage.get();
        if (!data.blacklist[target.id]) {
          return interaction.reply({ content: `❌ **${target.username}** kara listede değil.`, ephemeral: true });
        }
        storage.update(d => { delete d.blacklist[target.id]; });

        await interaction.reply({
          content: `✅ **${target.username}** kara listeden kaldırıldı.`,
          ephemeral: true,
        });
        await logBlacklistAction(interaction, target, 'kaldırıldı', null);
      }
    } catch (e) {
      console.error('[ticket-blacklist] error:', e);
      await interaction.reply({ content: '❌ İşlem sırasında bir hata oluştu.', ephemeral: true });
    }
  },
};

async function logBlacklistAction(interaction, target, action, reason) {
  const logChannelId = process.env.LOG_CHANNEL_ID;
  if (!logChannelId) return;
  try {
    const { EmbedBuilder } = require('discord.js');
    const logChannel = await interaction.guild.channels.fetch(logChannelId);
    if (!logChannel) return;
    const embed = new EmbedBuilder()
      .setColor(action === 'eklendi' ? 0xED4245 : 0x57F287)
      .setTitle(`🚫 Kara Liste ${action === 'eklendi' ? 'Ekleme' : 'Kaldırma'}`)
      .addFields(
        { name: 'Kullanıcı', value: `<@${target.id}> (${target.username})`, inline: true },
        { name: 'İşlemi Yapan', value: `<@${interaction.user.id}>`, inline: true },
        ...(reason ? [{ name: 'Sebep', value: reason, inline: false }] : []),
      )
      .setTimestamp();
    await logChannel.send({ embeds: [embed] });
  } catch (_) {}
}
