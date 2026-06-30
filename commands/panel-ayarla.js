'use strict';
const {
  SlashCommandBuilder, ModalBuilder, TextInputBuilder,
  TextInputStyle, ActionRowBuilder,
} = require('discord.js');
const storage = require('../storage');
const embeds = require('../helpers/embeds');
const buttons = require('../helpers/buttons');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel-ayarla')
    .setDescription('Destek paneli ayarlarını özelleştirir. (Sadece sunucu sahibi)'),

  async execute(interaction) {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
    }

    const data = storage.get();
    const s = data.panelSettings;

    const modal = new ModalBuilder()
      .setCustomId('panel_ayarla_modal')
      .setTitle('Panel Ayarları');

    const colorInput = new TextInputBuilder()
      .setCustomId('panel_color')
      .setLabel('Embed Rengi (HEX, örn: #5865F2)')
      .setStyle(TextInputStyle.Short)
      .setValue(s.color ? `#${s.color.toString(16).padStart(6, '0').toUpperCase()}` : '#5865F2')
      .setRequired(true)
      .setMaxLength(7);

    const titleInput = new TextInputBuilder()
      .setCustomId('panel_title')
      .setLabel('Başlık')
      .setStyle(TextInputStyle.Short)
      .setValue(s.title || '🎟️ Destek Merkezi')
      .setRequired(true)
      .setMaxLength(100);

    const descInput = new TextInputBuilder()
      .setCustomId('panel_description')
      .setLabel('Açıklama')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(s.description || '')
      .setRequired(true)
      .setMaxLength(2000);

    modal.addComponents(
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
    );

    await interaction.showModal(modal);
  },

  // Modal submit handler (called from interactionCreate)
  async handleModalSubmit(interaction) {
    const colorRaw = interaction.fields.getTextInputValue('panel_color').trim();
    const title = interaction.fields.getTextInputValue('panel_title').trim();
    const description = interaction.fields.getTextInputValue('panel_description').trim();

    // Validate hex color
    const hexMatch = colorRaw.match(/^#?([0-9A-Fa-f]{6})$/);
    if (!hexMatch) {
      return interaction.reply({ content: '❌ Geçersiz renk kodu. Örnek: `#5865F2`', ephemeral: true });
    }
    const colorInt = parseInt(hexMatch[1], 16);

    storage.update(d => {
      d.panelSettings.color = colorInt;
      d.panelSettings.title = title;
      d.panelSettings.description = description;
    });

    // Resend panel if it exists
    const data = storage.get();
    if (data.openPanelMessage) {
      try {
        const ch = await interaction.guild.channels.fetch(data.openPanelMessage.channelId);
        if (ch) {
          const msg = await ch.messages.fetch(data.openPanelMessage.messageId);
          if (msg) {
            const newEmbed = embeds.panelEmbed(data.panelSettings, interaction.guild);
            const menu = buttons.categorySelectMenu();
            await msg.edit({ embeds: [newEmbed], components: [menu] });
          }
        }
      } catch (_) { /* panel silinmiş olabilir */ }
    }

    await interaction.reply({
      content: '✅ Panel ayarları güncellendi ve panel yeniden gönderildi.',
      ephemeral: true,
    });
  },
};
