'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../storage');
const embeds = require('../helpers/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-istatistik')
    .setDescription('Ticket istatistiklerini gösterir. (Personel / Sahip)'),

  async execute(interaction) {
    const staffRoleId = process.env.STAFF_ROLE_ID;
    const isOwner = interaction.user.id === process.env.OWNER_ID;
    const isStaff = staffRoleId && interaction.member.roles.cache.has(staffRoleId);

    if (!isOwner && !isStaff) {
      return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
    }

    try {
      const data = storage.get();
      const embed = embeds.statsEmbed(data.stats);
      await interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (e) {
      console.error('[ticket-istatistik] error:', e);
      await interaction.reply({ content: '❌ İstatistikler alınırken hata oluştu.', ephemeral: true });
    }
  },
};
