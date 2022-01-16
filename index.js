require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api');
const HTMLParser = require('node-html-parser');

const { loadPage, getRandomInt } = require('./helpers');
const { BOT_TOKEN } = process.env;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const mainUrl = 'http://www.chakoteya.net';
const serials = {
    'TOS': {
        name: 'The Original Series + Animated Original Series',
        url: 'StarTrek',
        episodesUrl: 'episodes.htm',
        querySelector: 'td[width="44%"] a[href]',
    },
    'TNG': {
        name: 'The Next Generation',
        url: 'NextGen',
        episodesUrl: 'episodes.htm',
        querySelector: 'td[width="44%"] a[href]',
    },
    'DS9': {
        name: 'Deep Space 9',
        url: 'DS9',
        episodesUrl: 'episodes.htm',
        querySelector: 'td[width="44%"] a[href]',
    },
    'VOY': {
        name: 'Voyager',
        url: 'Voyager',
        episodesUrl: 'episode_listing.htm',
        querySelector: 'h2 + div > table a[href]',
    },
    'ENT': {
        name: 'Enterprise',
        url: 'Enterprise',
        episodesUrl: 'episodes.htm',
        querySelector: 'td[width="44%"] a[href]',
    }
}

const getRandomSceneFull = async (chatId) => {
    const randomSerial = getRandomInt(0, Object.keys(serials).length - 1);
    // const type = Object.keys(serials)[randomSerial];
    const type = 'TOS'

    const techMsg = await bot.sendMessage(chatId, `Открываю список серий для ${type}`);
    const techMsgId = techMsg.message_id;

    let content;
    let dom;
    let url = [mainUrl, serials[type].url, serials[type].episodesUrl].join('/');
    
    content = await loadPage(url);
    dom = HTMLParser.parse(content);
    
    const links = dom.querySelectorAll(serials[type].querySelector);
    const randomLink = getRandomInt(0, links.length - 1);
    const hrefAttribute = links[randomLink].getAttribute('href');
    const name = links[randomLink].textContent.replace(/[\n\r]/g,' ');
    
    url = [mainUrl, serials[type].url, hrefAttribute].join('/');

    console.log(`Для чат айди ${chatId} выбрана серия ${name} ${url} (${randomLink})`);
    bot.editMessageText(`Выбрал случайную серию ${type} ${name}`, { chat_id: chatId, message_id: techMsgId });

    const text = [
        `${serials[type].name}`,
        // `<b>Сезон:</b>`,  
        // `<b>Серия:</b>`,  
        `<b>Название:</b> ${name}`,  
        `<a href="${url}"><b>Транскрипт</b></a>`,  
    ];

    bot.sendMessage(chatId, text.join('\n'), { parse_mode: 'HTML' })

    content = await loadPage(url);
    dom = HTMLParser.parse(content);

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