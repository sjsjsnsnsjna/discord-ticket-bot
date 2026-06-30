# 🎟️ Discord Ticket Bot

Premium görünümlü, Türkçe arayüzlü Discord destek ticket botu. discord.js v14, Replit üzerinde 7/24 çalışmak üzere tasarlanmıştır.

---

## ⚙️ Replit Secrets (Ortam Değişkenleri)

Replit panelinde **Secrets** bölümüne aşağıdaki değerleri ekle:

| Secret Adı | Açıklama |
|---|---|
| `DISCORD_TOKEN` | Bot token'ı (Discord Developer Portal > Bot > Token) |
| `CLIENT_ID` | Bot'un uygulama ID'si (Discord Developer Portal > General Information) |
| `GUILD_ID` | Botun ekleneceği sunucunun ID'si (Sunucuya sağ tıkla > ID Kopyala) |
| `OWNER_ID` | Sunucu sahibinin Discord kullanıcı ID'si |
| `TICKET_CATEGORY_ID` | Ticket kanallarının açılacağı kategori ID'si |
| `STAFF_ROLE_ID` | Destek ekibinin rolünün ID'si |
| `LOG_CHANNEL_ID` | Transcript ve log mesajlarının gönderileceği kanal ID'si |

> **ID nasıl alınır?** Discord'da Ayarlar > Gelişmiş > Geliştirici Modu'nu aç. Ardından sunucu/kanal/kullanıcıya sağ tıklayıp "ID Kopyala" de.

---

## 🤖 Botu Sunucuya Davet Etme

Aşağıdaki URL'yi tarayıcıda aç ve sunucunu seç:

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID_BURAYA&permissions=8&scope=bot%20applications.commands
```

> `CLIENT_ID_BURAYA` yerine gerçek Client ID'ni yaz.

**Gerekli İzinler:**
- `bot` scope + `applications.commands` scope
- Administrator (veya en azından: Manage Channels, Manage Roles, Read/Send Messages, Embed Links, Attach Files, Manage Messages)

**Gerekli Intents (Discord Developer Portal > Bot > Privileged Gateway Intents):**
- ✅ Server Members Intent
- ✅ Message Content Intent

---

## 🚀 Botu Çalıştırma

1. Replit'te Secrets'leri doldur
2. **Run** butonuna bas ya da konsolda `node index.js` çalıştır
3. Bot açılırken komutlar otomatik olarak sunucuya kaydedilir

---

## 📡 UptimeRobot ile 7/24 Canlı Tutma

Bot, port `3000`'de bir web sunucusu çalıştırır. UptimeRobot bu sunucuya her 5 dakikada bir ping atarak Replit'in botu uyutmasını engeller.

1. [uptimerobot.com](https://uptimerobot.com) adresine kaydol (ücretsiz)
2. **Add New Monitor** > **HTTP(s)**
3. **URL:** Replit'teki botun URL'si (örn: `https://ticket-bot.kullanici.repl.co`)
4. **Monitoring Interval:** 5 minutes
5. Kaydet — bot artık 7/24 çevrimiçi kalır

---

## 📋 Slash Komutları

| Komut | Yetki | Açıklama |
|---|---|---|
| `/panel-kur` | Sahip | Destek panelini kanala gönderir (kategori seçim menüsüyle birlikte) |
| `/panel-ayarla` | Sahip | Panel rengini, başlığını ve açıklamasını özelleştirir (modal ile) |
| `/ticket-istatistik` | Personel / Sahip | Toplam ticket, kapatma süresi, memnuniyet puanı, personel sıralaması |
| `/ticket-blacklist ekle` | Sahip | Kullanıcıyı kara listeye ekler (ticket açamaz) |
| `/ticket-blacklist kaldir` | Sahip | Kullanıcıyı kara listeden kaldırır |

### Ticket İçi Butonlar

| Buton | Açıklama |
|---|---|
| 🔒 Kapat | Onay sonrası transcript oluşturur, log'a gönderir, kanalı siler |
| 🙋 Sahiplen | Personel ticketi sahiplenir (tek kişi; sonra pasif olur) |
| ➕ Kullanıcı Ekle | Kanala başka bir üye eklenir (ID ile) |

---

## 🗂️ Dosya Yapısı

```
discord-bot/
├── index.js              # Ana giriş noktası, client + event setup
├── keepAlive.js          # Express web sunucusu (UptimeRobot için)
├── storage.js            # JSON tabanlı kalıcı depolama (data.json)
├── deploy-commands.js    # Manuel komut kayıt scripti
├── commands/
│   ├── panel-kur.js
│   ├── panel-ayarla.js
│   ├── ticket-istatistik.js
│   └── ticket-blacklist.js
├── handlers/
│   └── interactionCreate.js  # Tüm interaction routing
├── helpers/
│   ├── embeds.js         # Embed builder'lar
│   ├── buttons.js        # Button/select menu builder'lar
│   └── ticket.js         # Ticket oluşturma ve kapatma mantığı
├── scheduler/
│   └── autoClose.js      # Hareketsizlik kontrolü + otomatik kapatma
└── data.json             # Otomatik oluşturulur (ticket verileri)
```

---

## ⚠️ Notlar

- `data.json` dosyası bot ilk çalıştığında otomatik oluşturulur. Silme!
- Ticket kanalları `TICKET_CATEGORY_ID` altında açılır — bu kategoriyi önce Discord'da oluştur.
- `LOG_CHANNEL_ID` boş bırakılırsa transcript log'ları gönderilmez ama bot çalışmaya devam eder.
- Otomatik kapatma: 24 saat hareketsizlik → uyarı, +1 saat → otomatik kapatma.
