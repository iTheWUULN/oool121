const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js'); // Eksikse ekle
require('dotenv').config(); // Eğer .env kullanıyorsan

const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const db = new sqlite3.Database('./giveaways.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;


// Çekiliş Tablosu Oluşturuluyor
db.run(`
    CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT,
        prize TEXT,
        winner_count INTEGER,
        end_time INTEGER,
        extra_role TEXT,
        message_id TEXT,
        status TEXT
    )
`);

// Çekilişleri Veritabanından Yükle
async function loadGiveaways() {
    db.all("SELECT * FROM giveaways WHERE status = 'active'", async (err, rows) => {
        if (err) {
            console.error(err.message);
        } else {
            for (const giveaway of rows) {
                const channel = await client.channels.fetch(giveaway.channel_id);
                const message = await channel.messages.fetch(giveaway.message_id);
                const remainingTime = giveaway.end_time - Date.now();

                if (remainingTime > 0) {
                    startCountdown(message, giveaway);
                } else {
                    endGiveaway(message, giveaway);
                }
            }
        }
    });
}

// Çekilişi Başlat
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'çekiliş-başlat') {
        const member = interaction.member;
        if (!member.roles.cache.has('1355324280400908476')) {
            return interaction.reply('Bu komutu kullanmak için gerekli role sahip değilsiniz.');
        }

        const channel = interaction.options.getChannel('kanal');
        const prize = interaction.options.getString('ödül');
        const extraRole = interaction.options.getRole('ekstra_katılım');
        const day = interaction.options.getInteger('gün') || 0;
        const hour = interaction.options.getInteger('saat') || 0;
        const minute = interaction.options.getInteger('dakika') || 0;
        const second = interaction.options.getInteger('saniye') || 0;
        const winnerCount = interaction.options.getInteger('kazanan_sayısı');

        const totalTime = (day * 86400) + (hour * 3600) + (minute * 60) + second;
        const endTime = Date.now() + totalTime * 1000;

        const embed = new EmbedBuilder()
            .setColor('#00ff22')
            .setTitle(`**Ödül: ${prize}**`)
            .addFields(
                { name: '**Kalan Zaman**', value: `<t:${Math.floor(endTime / 1000)}:R>` },
                { name: '**Katılım**', value: 'Katılmak için :tada: emojisine tıklayın!' },
                { name: '**Ekstra Katılım**', value: extraRole ? `${extraRole} rolü için 2x kazanma şansı` : 'Yok' },
                { name: '**Kazanan Sayısı**', value: winnerCount.toString() }
            );

        const message = await channel.send({ embeds: [embed] });
        message.react('🎉');

        db.run(`
            INSERT INTO giveaways (channel_id, prize, winner_count, end_time, extra_role, message_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,

            [channel.id, prize, winnerCount, endTime, extraRole ? extraRole.id : null, message.id, 'active']
        );

        interaction.reply('Çekiliş başarıyla başlatıldı!');

        // Süreyi Güncelleme
        startCountdown(message, { channel_id: channel.id, prize, winner_count: winnerCount, end_time: endTime, extra_role: extraRole ? extraRole.id : null, message_id: message.id });
    }
});

// Çekiliş Süresi Güncelleme
function startCountdown(message, giveaway) {
    const interval = setInterval(async () => {
        const remainingTime = giveaway.end_time - Date.now();

        if (remainingTime <= 0) {
            clearInterval(interval);
            await endGiveaway(message, giveaway);
            return;
        }

        const embedToUpdate = new EmbedBuilder()
            .setColor('#00ff22')
            .setTitle(`**Ödül: ${giveaway.prize}**`)
            .addFields(
                { name: '**Kalan Zaman**', value: `<t:${Math.floor(giveaway.end_time / 1000)}:R>` },
                { name: '**Katılım**', value: 'Katılmak için :tada: emojisine tıklayın!' },
                { name: '**Ekstra Katılım**', value: giveaway.extra_role ? `<@&${giveaway.extra_role}> rolü için 2x kazanma şansı` : 'Yok' },
                { name: '**Kazanan Sayısı**', value: giveaway.winner_count.toString() }
            );

        await message.edit({ embeds: [embedToUpdate] });
    }, 1000);
}

// Çekilişin Sonlandırılması
async function endGiveaway(message, giveaway) {
    const channel = await client.channels.fetch(giveaway.channel_id);
    const users = await message.reactions.cache.get('🎉').users.fetch();
    const nonBotUsers = users.filter(user => !user.bot);
    const winners = nonBotUsers.random(giveaway.winner_count);

    let winnerList = winners.map(user => `<@${user.id}>`).join(', ');

    const embed = new EmbedBuilder()
        .setColor('#ff0004')
        .setTitle(`Çekiliş Bitti: ${giveaway.prize}`)  // Burada prize'in olup olmadığını kontrol ediyoruz
        .addFields(
            { name: 'Kazanan(lar)', value: winnerList || 'Kazanan bulunamadı.' }
        );

    await message.edit({ embeds: [embed] });

    if (winnerList) {
        // Sunucu Bildirimi
        channel.send(`🎉 Tebrikler! Kazananlar: ${winnerList}`);
        
        // Kazananlara DM
        winners.forEach(async (winner) => {
            try {
                await winner.send(`🎉 Tebrikler! ${giveaway.prize} ödülünü kazandınız!`);
            } catch (error) {
                console.error(`Kazanan kullanıcıya DM gönderilemedi: ${winner.username}`);
            }
        });
    }

    // Çekilişi Veritabanından Sil
    db.run(`UPDATE giveaways SET status = 'ended' WHERE message_id = ?`, [giveaway.message_id]);
}

client.login(process.env.TOKEN); // Bot token'ını buraya doğru bir şekilde yerleştirdiğinizden emin olun

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await loadGiveaways(); // Başlangıçta devam eden çekilişleri yükle
});

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Unhandled Promise Rejections (Promise hatalarını yakalar)
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection at:', error);
    // Botu kapatmayacak şekilde işlem yapabilirsiniz.
});

// Uncaught Exceptions (Try-catch ile yakalanmayan hataları yakalar)
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Burada da botu kapatmadan hatayı logluyoruz
});


const express = require('express');
const app = express();
const port = 3100;//buraya karışmayın.

app.get('/', (req, res) => res.send('we discord'));//değiştirebilirsiniz.

app.listen(port, () =>
console.log(`Bot bu adres üzerinde çalışıyor: http://localhost:${port}`)//port
);
