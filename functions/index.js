const functions = require('firebase-functions');
const request = require('request-promise');
const express = require('express')
const app = express()
const config = require('./config.json')
const Fixer = require('fixer-node')
const fixer = new Fixer(config.accessKey_Fixer)
const symbol = require('./currencyList')
const { isNumber, modifiedOutput } = require('./helpers/helpers');

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message'
const LINE_HEADER = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.channelAccessToken}`
}

const runtimeOpts = {
    timeoutSeconds: 300,
    memory: '1GB'
}

exports.LineBot = functions.runWith(runtimeOpts).https.onRequest(async (req, res) => {
    //input
    const { type, text } = req.body.events[0].message;
    let baseAmount = 1;
    let baseCurrency = 'USD';
    let targetAmount = 0;
    let targetCurrency = 'THB';

    res.status(200)
    if (type !== 'text') {
        return reply(req.body, 'น้องดอลล่าไม่เข้าใจครับ');
    }

    if (text === 'ช่วยด้วย') {
        return reply(req.body, `1. หากใส่ตัวเลขเพียอย่างเดียว จะเปลี่ยนค่า USD => THB \n2. หากต้องการเปลี่ยนค่าเงินอื่นเป็นเงินบาทให้ใส่สกุลเงิน เช่น 30 USD\n
        3.หากต้องการเทียบค่าเงินอื่นให้พิมค่าเงิน เช่น USD to KRW\n 4.หากต้องการเปลี่ยนสกุลเงินพร้อมจำนวนให้ใส่ตัวเลขไปด้านหน้า เช่น 30 USD to KRW`);
    }

    const regex = /\w+/g;
    const arrText = text.toUpperCase().match(regex);
    if (arrText === null) {
        return reply(req.body, 'แพทเทิร์นไม่ถูกต้อง')
    }

    const firstArgument = arrText[0];
    const secondArgument = arrText[1];
    const thirdArgument = arrText[2];

    if (arrText.length === 1) {
        // ex. 100 => 100 USD TO ... THB
        if (isNumber(firstArgument)) {
            baseAmount = firstArgument;
        }
        // TODO: implement currency case
        else {
            baseCurrency = firstArgument;
        };
    }
    // ex. 50 KRW => 50 KRW TO .. THB
    else if (arrText.length === 2 && isNumber(firstArgument)) {
        baseAmount = Number(firstArgument);
        baseCurrency = secondArgument;
    }
    // ex. AED to KRW => 1 AED TO ... KRW
    else if (arrText.length === 3 && arrText[1] === 'TO') {
        baseCurrency = firstArgument;
        targetCurrency = thirdArgument;
    }
    // ex. 20 AED to KRW => 20 AED TO ... KRW
    else if (arrText.length === 4 && arrText[2] === 'TO') {
        baseAmount = Number(firstArgument);
        baseCurrency = secondArgument;
        targetCurrency = thirdArgument;
    }
    else {
        return reply(req.body, 'โปรดใส่แพทเทิร์นให้ถูกต้อง')
    }

    if (!symbol.hasOwnProperty(baseCurrency) || !symbol.hasOwnProperty(targetCurrency)) {
        return reply(req.body, 'โปรดใส่จำนวนเงินหรือสกุลเงินที่ถูกต้อง')
    };

    const { rates } = await fixer.latest({ symbols: `${baseCurrency}, ${targetCurrency}` })
    targetAmount = baseAmount * rates[targetCurrency] / rates[baseCurrency];
    return reply(req.body, modifiedOutput({
        baseAmount,
        baseCurrency,
        targetAmount,
        targetCurrency
    }))
})


const reply = (bodyResponse, text) => {
    return request({
        method: 'POST',
        uri: `${LINE_MESSAGING_API}/reply`,
        headers: LINE_HEADER,
        body: JSON.stringify({
            replyToken: bodyResponse.events[0].replyToken,
            messages: [
                {
                    type: 'text',
                    text,
                }
            ]
        })
    })
}
