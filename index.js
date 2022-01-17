require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const HTMLParser = require('node-html-parser');

const { loadPage, getRandomInt } = require('./helpers');
const serials = require('./data/series.json');

const { BOT_TOKEN } = process.env;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const mainUrl = 'http://www.chakoteya.net';

const getRandomSceneFull = async (chatId) => {
    const randomSerial = getRandomInt(0, Object.keys(serials).length - 1);
    const type = Object.keys(serials)[randomSerial];

    const techMsg = await bot.sendMessage(chatId, `Открываю список серий для ${type}`);
    const techMsgId = techMsg.message_id;

    const links = serials[type].series;
    const randomSeason = getRandomInt(0, (links.length - 1));
    const randomLink = getRandomInt(0, links[randomSeason].length - 1);
    const link = links[randomSeason][randomLink];
    const hrefAttribute = link.link;
    const name = link.name;
    
    let url = [mainUrl, serials[type].urlPrefix, hrefAttribute].join('/');

    console.log(`Для чат айди ${chatId} выбрана серия ${name} (${link} S${randomSeason}E${randomLink})`);
    bot.editMessageText(`Выбрал случайную серию ${type} ${name}`, { chat_id: chatId, message_id: techMsgId });
    
    const text = [
        `${serials[type].caption}`,
        `<b>Сезон: ${randomSeason + 1}</b>`,  
        `<b>Серия:${randomLink + 1}</b>`,  
        `<b>Название:</b> ${name}`,
        `<a href="${url}"><b>Транскрипт</b></a>`,
    ];
    
    bot.sendMessage(chatId, text.join('\n'), { parse_mode: 'HTML' })
    
    let content = await loadPage(url);
    let dom = HTMLParser.parse(content);

    const scenes = dom.querySelectorAll('td[width="85%"] p');

    bot.editMessageText(`Выбрал случайную сцену`, { chat_id: chatId, message_id: techMsgId });

    let randomScene, randomSceneText;
    let i = 0;

    do {
        randomScene = getRandomInt(0, scenes.length - 1);
        randomSceneText = scenes[randomScene].textContent.trim().substring(0, 2048);

        if (randomSceneText === '') {
            scenes.splice(randomScene, 1)
        }

        bot.editMessageText(`Ищу случайный абзац ${i + 1} раз`, { chat_id: chatId, message_id: techMsgId });
        i++;
    } while (randomSceneText === '' && i < 5)

    bot.sendMessage(chatId, randomSceneText);
}

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`Сделан запрос start от чат айди ${chatId}`);
    try {
        bot.sendMessage(
            chatId,
            'Привет! Давай погадаем? Загадывай вопрос, я начинаю искать то, что подходит тебе среди сериалов Star Trek.',
            {
                reply_markup: {
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    inline_keyboard: [
                        [
                            {
                                text: 'Поехали!',
                                callback_data: 'rand'
                            }
                        ]
                    ]
                },
            }
        );

    } catch (error) {
        bot.sendMessage(chatId, 'Ой! Что-то случилось! Может, попробуете еще раз?');
        console.log(`Ошибка в чате ${chatId}\n${error}`);
    }
})

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    // message_id: msg.message_id,

    if (action === 'rand') {
        getRandomSceneFull(chatId);
    }

    return bot.answerCallbackQuery(callbackQuery.id);
});

bot.onText(/\/rand/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`Сделан запрос rand от чат айди ${chatId}`);
    try {
        getRandomSceneFull(chatId);
    } catch (error) {
        bot.sendMessage(chatId, 'Ой! Что-то случилось! Может, попробуете еще раз?');
        console.log(`Ошибка в чате ${chatId}\n${error}`);
    }
});

bot.on('error', (error) => {
    console.log(error.code);
});

bot.on('polling_error', (error) => {
    console.log(error);
});