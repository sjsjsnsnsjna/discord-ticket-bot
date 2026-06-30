'use strict';
const {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
} = require('discord.js');
const storage = require('../storage');
const embeds = require('../helpers/embeds');
const buttons = require('../helpers/buttons');
const ticketHelper = require('../helpers/ticket');
const panelAyarla = require('../commands/panel-ayarla');

async function handleInteraction(interaction, client) {
  try {
    // ── Slash Commands ──────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    // ── Modal Submits ───────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'panel_ayarla_modal') {
        await panelAyarla.handleModalSubmit(interaction);
        return;
      }

      if (interaction.customId.startsWith('ticket_modal_')) {
        await handleTicketModalSubmit(interaction, client);
        return;
      }

      if (interaction.customId.startsWith('adduser_modal_')) {
        await handleAddUserModal(interaction);
        return;
      }
    }

    // ── Select Menu ─────────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_category_select') {
        await handleCategorySelect(interaction);
        return;
      }
    }

    // ── Buttons ─────────────────────────────────────────────────
    if (interaction.isButton()) {
      await handleButton(interaction, client);
      return;
    }
  } catch (e) {
    console.error('[interactionCreate] unhandled error:', e);
    try {
      const msg = { content: '❌ Bir hata oluştu. Lütfen tekrar deneyin.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    } catch (_) {}
  }
}

// ── Category Select ─────────────────────────────────────────────
async function handleCategorySelect(interaction) {
  const category = interaction.values[0];
  const data = storage.get();

  // Blacklist check
  if (data.blacklist[interaction.user.id]) {
    const bl = data.blacklist[interaction.user.id];
    return interaction.reply({
      content: `🚫 Ticket açma yetkiniz kaldırılmış.\n📝 Sebep: ${bl.reason || 'Belirtilmedi'}`,
      ephemeral: true,
    });
  }

  // Duplicate ticket check
  if (data.userOpenTickets[interaction.user.id]) {
    const existingChannelId = data.userOpenTickets[interaction.user.id];
    return interaction.reply({
      content: `⚠️ Zaten açık bir destek talebiniz var: <#${existingChannelId}>\nYeni bir ticket açmadan önce mevcut talebinizi kapatın.`,
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${category}`)
    .setTitle('🎟️ Destek Talebi Oluştur');

  const subjectInput = new TextInputBuilder()
    .setCustomId('ticket_subject')
    .setLabel('Konunuzu kısaca belirtin')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Örn: Ödeme işleminde sorun yaşıyorum')
    .setRequired(true)
    .setMaxLength(200);

  const priorityInput = new TextInputBuilder()
    .setCustomId('ticket_priority')
    .setLabel('Öncelik: dusuk / orta / acil')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('dusuk, orta veya acil yazın')
    .setValue('orta')
    .setRequired(true)
    .setMaxLength(5);

  modal.addComponents(
    new ActionRowBuilder().addComponents(subjectInput),
    new ActionRowBuilder().addComponents(priorityInput),
  );

  await interaction.showModal(modal);
}

// ── Ticket Modal Submit ─────────────────────────────────────────
async function handleTicketModalSubmit(interaction, client) {
  const category = interaction.customId.replace('ticket_modal_', '');
  const subject = interaction.fields.getTextInputValue('ticket_subject').trim();
  const priorityRaw = interaction.fields.getTextInputValue('ticket_priority').trim().toLowerCase();
  const priority = ['dusuk', 'orta', 'acil'].includes(priorityRaw) ? priorityRaw : 'orta';

  // Re-check blacklist and duplicate after modal
  const data = storage.get();
  if (data.blacklist[interaction.user.id]) {
    return interaction.reply({ content: '🚫 Ticket açma yetkiniz kaldırılmış.', ephemeral: true });
  }
  if (data.userOpenTickets[interaction.user.id]) {
    return interaction.reply({
      content: `⚠️ Zaten açık bir destek talebiniz var: <#${data.userOpenTickets[interaction.user.id]}>`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const channel = await ticketHelper.createTicketChannel(
      interaction.guild, interaction.user, category, subject, priority,
    );
    await interaction.editReply({ content: `✅ Destek talebiniz oluşturuldu: ${channel}` });
  } catch (e) {
    console.error('[ticket modal submit] error:', e);
    await interaction.editReply({ content: '❌ Ticket oluşturulurken bir hata oluştu.' });
  }
}

// ── Button Handler ──────────────────────────────────────────────
async function handleButton(interaction, client) {
  const id = interaction.customId;

  // Close button (initial)
  if (id.startsWith('ticket_close_') && !id.includes('confirm') && !id.includes('cancel')) {
    const channelId = id.replace('ticket_close_', '');
    const confirmEmbed = embeds.closeConfirmEmbed();
    const confirmButtons = buttons.closeConfirmButtons(channelId);
    return interaction.reply({ embeds: [confirmEmbed], components: [confirmButtons], ephemeral: true });
  }

  // Close confirm
  if (id.startsWith('ticket_close_confirm_')) {
    const channelId = id.replace('ticket_close_confirm_', '');
    const data = storage.get();
    const ticket = data.tickets[channelId];

    if (!ticket) return interaction.reply({ content: '❌ Bu ticket bulunamadı.', ephemeral: true });

    await interaction.reply({ content: '🔒 Ticket kapatılıyor...', ephemeral: true });

    try {
      await ticketHelper.closeTicket(interaction.channel, interaction.guild, interaction.user, client);
    } catch (e) {
      console.error('[close confirm] error:', e);
    }
    return;
  }

  // Close cancel
  if (id.startsWith('ticket_close_cancel_')) {
    return interaction.reply({ content: '✅ Kapatma işlemi iptal edildi.', ephemeral: true });
  }

  // Claim button
  if (id.startsWith('ticket_claim_')) {
    const channelId = id.replace('ticket_claim_', '');
    const staffRoleId = process.env.STAFF_ROLE_ID;
    const isStaff = staffRoleId ? interaction.member.roles.cache.has(staffRoleId) : false;
    const isOwner = interaction.user.id === process.env.OWNER_ID;

    if (!isStaff && !isOwner) {
      return interaction.reply({ content: '❌ Bu işlem için personel rolüne ihtiyacınız var.', ephemeral: true });
    }

    const data = storage.get();
    const ticket = data.tickets[channelId];
    if (!ticket) return interaction.reply({ content: '❌ Ticket bulunamadı.', ephemeral: true });
    if (ticket.claimerId) {
      return interaction.reply({ content: `⚠️ Bu ticket zaten <@${ticket.claimerId}> tarafından sahiplenilmiş.`, ephemeral: true });
    }

    storage.update(d => {
      if (d.tickets[channelId]) {
        d.tickets[channelId].claimerId = interaction.user.id;
      }
    });

    try {
      await interaction.channel.setTopic(
        `${interaction.channel.topic || ''} | 🙋 Sahiplenen: ${interaction.user.username}`,
      );
    } catch (_) {}

    // Update the original message's buttons
    try {
      const msgs = await interaction.channel.messages.fetch({ limit: 10 });
      const botMsg = msgs.find(m => m.author.bot && m.components.length > 0);
      if (botMsg) {
        await botMsg.edit({ components: [buttons.ticketActionButtons(channelId, true)] });
      }
    } catch (_) {}

    return interaction.reply({
      content: `🙋 **${interaction.user.username}** bu ticketi sahiplendi!`,
    });
  }

  // Add User button
  if (id.startsWith('ticket_adduser_')) {
    const channelId = id.replace('ticket_adduser_', '');
    const modal = new ModalBuilder()
      .setCustomId(`adduser_modal_${channelId}`)
      .setTitle('Kullanıcı Ekle');
    const input = new TextInputBuilder()
      .setCustomId('adduser_id')
      .setLabel('Kullanıcı ID veya @mention')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Kullanıcının Discord ID\'sini girin')
      .setRequired(true)
      .setMaxLength(30);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  // Satisfaction rating buttons
  if (id.startsWith('rating_')) {
    const parts = id.split('_');
    const rating = parseInt(parts[1]);
    const ticketId = parts.slice(2).join('_');

    if (isNaN(rating) || rating < 1 || rating > 5) return;

    storage.update(d => {
      d.stats.ratings.push(rating);
    });

    try {
      const logChannelId = process.env.LOG_CHANNEL_ID;
      if (logChannelId) {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel) {
          const ratingEmbed = embeds.ratingRecordedEmbed(interaction.user.id, rating);
          await logChannel.send({ embeds: [ratingEmbed] });
        }
      }
    } catch (_) {}

    await interaction.update({
      content: `✅ Değerlendirmeniz kaydedildi: ${'⭐'.repeat(rating)} (${rating}/5) — Teşekkürler!`,
      components: [],
      embeds: [],
    });
  }
}

// ── Add User Modal ──────────────────────────────────────────────
async function handleAddUserModal(interaction) {
  const channelId = interaction.customId.replace('adduser_modal_', '');
  const rawInput = interaction.fields.getTextInputValue('adduser_id').trim().replace(/\D/g, '');

  if (!rawInput) return interaction.reply({ content: '❌ Geçersiz kullanıcı ID.', ephemeral: true });

  try {
    const member = await interaction.guild.members.fetch(rawInput);
    if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı.', ephemeral: true });

    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) return interaction.reply({ content: '❌ Ticket kanalı bulunamadı.', ephemeral: true });

    await channel.permissionOverwrites.create(member, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    await interaction.reply({ content: `✅ ${member} bu tickete eklendi.` });
  } catch (e) {
    console.error('[adduser modal] error:', e);
    await interaction.reply({ content: '❌ Kullanıcı eklenirken hata oluştu. ID\'yi kontrol edin.', ephemeral: true });
  }
}

module.exports = { handleInteraction };
