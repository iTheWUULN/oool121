const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
require('dotenv').config();
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

console.log("TOKEN:", process.env.TOKEN); // Token’in gelip gelmediğini görmek için
const token = process.env.TOKEN;

const commands = [
    {
        name: 'çekiliş-başlat',
        description: 'Bir çekiliş başlatır',
        options: [
            {
                name: 'kanal',
                type: ApplicationCommandOptionType.Channel,
                description: 'Çekilişin yapılacağı kanal',
                required: true,
            },
            {
                name: 'ödül',
                type: ApplicationCommandOptionType.String,
                description: 'Çekiliş ödülü',
                required: true,
            },
            {
                name: 'kazanan_sayısı',
                type: ApplicationCommandOptionType.Integer,
                description: 'Kazanan sayısı',
                required: true,
            },
            {
                name: 'ekstra_katılım',
                type: ApplicationCommandOptionType.Role,
                description: 'Ekstra katılım şansı verecek rol',
                required: false,
            },
            {
                name: 'gün',
                type: ApplicationCommandOptionType.Integer,
                description: 'Çekiliş süresi (gün)',
                required: false,
            },
            {
                name: 'saat',
                type: ApplicationCommandOptionType.Integer,
                description: 'Çekiliş süresi (saat)',
                required: false,
            },
            {
                name: 'dakika',
                type: ApplicationCommandOptionType.Integer,
                description: 'Çekiliş süresi (dakika)',
                required: false,
            },
            {
                name: 'saniye',
                type: ApplicationCommandOptionType.Integer,
                description: 'Çekiliş süresi (saniye)',
                required: false,
            },
        ],
    },
    {
        name: 'çekiliş-bitir',
        description: 'Bir çekilişi bitirir',
        options: [
            {
                name: 'çekiliş_id',
                type: ApplicationCommandOptionType.String,
                description: 'Bitirilecek çekilişin mesaj ID\'si',
                required: true,
            },
            {
                name: 'kazanan_sayısı',
                type: ApplicationCommandOptionType.Integer,
                description: 'Kazanan sayısı',
                required: true,
            },
        ],
    },
    {
        name: 'süre-düzenle',
        description: 'Çekiliş süresini düzenler',
        options: [
            {
                name: 'çekiliş_id',
                type: ApplicationCommandOptionType.String,
                description: 'Düzenlenecek çekilişin mesaj ID\'si',
                required: true,
            },
            {
                name: 'gün',
                type: ApplicationCommandOptionType.Integer,
                description: 'Yeni süre (gün)',
                required: false,
            },
            {
                name: 'saat',
                type: ApplicationCommandOptionType.Integer,
                description: 'Yeni süre (saat)',
                required: false,
            },
            {
                name: 'dakika',
                type: ApplicationCommandOptionType.Integer,
                description: 'Yeni süre (dakika)',
                required: false,
            },
            {
                name: 'saniye',
                type: ApplicationCommandOptionType.Integer,
                description: 'Yeni süre (saniye)',
                required: false,
            },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
