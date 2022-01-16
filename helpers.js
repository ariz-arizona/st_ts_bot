const fetch = require('cross-fetch');

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
}

const loadPage = async (url) => {
    // console.log(url)
    if (!url) {
        return false
    }
    try {
        const res = await fetch(url);

        if (res.status >= 400) {
            throw new Error("Bad response from server");
        }

        return await res.text();
    } catch (err) {
        console.error(err);
    }
};

module.exports = { getRandomInt, loadPage }