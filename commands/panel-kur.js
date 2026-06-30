'use strict';
const { SlashCommandBuilder } = require('discord.js');
const storage = require('../storage');
const embeds = require('../helpers/embeds');
const buttons = require('../helpers/buttons');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel-kur')
    .setDescription('Destek panelini bu kanala gönderir. (Sadece sunucu sahibi)'),

  async execute(interaction) {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const data = storage.get();
      const settings = data.panelSettings;

      // Delete old panel if exists
      if (data.openPanelMessage) {
        try {
          const oldChannel = await interaction.guild.channels.fetch(data.openPanelMessage.channelId);
          if (oldChannel) {
            const oldMsg = await oldChannel.messages.fetch(data.openPanelMessage.messageId);
            if (oldMsg) await oldMsg.delete();
          }
        } catch (_) { /* panel silinmiş olabilir */ }
      }

      const embed = embeds.panelEmbed(settings, interaction.guild);
      const menu = buttons.categorySelectMenu();

      const msg = await interaction.channel.send({ embeds: [embed], components: [menu] });

      storage.update(d => {
        d.openPanelMessage = { channelId: interaction.channel.id, messageId: msg.id };
      });

      await interaction.editReply({ content: '✅ Destek paneli başarıyla bu kanala gönderildi.' });
    } catch (e) {
      console.error('[panel-kur] error:', e);
      await interaction.editReply({ content: '❌ Panel oluşturulurken bir hata oluştu.' });
    }
  },
};
