const functions = require('firebase-functions');
const request = require('request-promise');
const express = require('express')
const app = express()
const config = require('./config.json')
const Fixer = require('fixer-node')
const fixer = new Fixer(config.accessKey_Fixer)
const symbol = require('./currencyList')

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
    console.log(req.body.events);
    const receiveText = req.body.events[0].message

    res.status(200)
    if (receiveText.type !== 'text') {
        return reply(req.body, 'น้องดอลล่าไม่เข้าใจครับ');
    }

    if (receiveText.text === 'ช่วยด้วย') {
        reply(req.body, `1. หากใส่ตัวเลขเพียอย่างเดียว จะเปลี่ยนค่า USD => THB \n2. หากต้องการเปลี่ยนค่าเงินอื่นเป็นเงินบาทให้ใส่สกุลเงิน เช่น 30 USD\n
        3.หากต้องการเทียบค่าเงินอื่นให้พิมค่าเงิน เช่น USD to KRW\n 4.หากต้องการเปลี่ยนสกุลเงินพร้อมจำนวนให้ใส่ตัวเลขไปด้านหน้า เช่น 30 USD to KRW`)
    }

    const regex = /\w+/g;
    const arrText = receiveText.text.toUpperCase().match(regex)
    if (arrText === null) {
        return reply(req.body, 'แพทเทิร์นไม่ถูกต้อง')
    }
    if (arrText.length === 1 && arrText[Object.keys(arrText)[0]] * 0 === 0) {
        const rate = await fixer.latest({ symbols: `USD, THB` })
        const amount = Number(receiveText.text)
        return reply(req.body, `ตอนนี้ ${receiveText.text} USD ประมาณ ${amount * rate.rates.THB / rate.rates.USD} บาท`)
    } else if (arrText.length === 1) {
        return reply(req.body, 'โปรดใส่จำนวนเงินหรือแพทเทิร์นที่ถูกต้อง')
    }

    const currency = arrText[Object.keys(arrText)[1]].toUpperCase()
    for (let key in symbol) {
        if (arrText.length === 1 && !symbol.hasOwnProperty(currency)) {
            return reply(req.body, 'ไม่มีสกุลเงินนี้หรือแพทเทิร์นไม่ถูกต้อง โปรดลองอีกครั้ง')
        }
    }

    if (arrText.length === 2 && arrText[Object.keys(arrText)[0]] * 0 === 0) {
        const rate = await fixer.latest({ symbols: `${currency}, THB` })
        const amount = Number(arrText[Object.keys(arrText)[0]])
        const result = amount * rate.rates.THB / rate.rates[currency]
        reply(req.body, `ตอนนี้ ${amount} ${currency} ประมาณ ${result} บาท`)
    } else if (arrText.length === 3 && arrText[1] === 'TO') {
        const baseCurrency = arrText[Object.keys(arrText)[0]]
        const targetCurrency = arrText[Object.keys(arrText)[2]]
        const rate = await fixer.latest({ symbols: `${baseCurrency}, ${targetCurrency}` })
        const result = rate.rates[targetCurrency] / rate.rates[baseCurrency]
        reply(req.body, `ตอนนี้ 1 ${baseCurrency} เท่ากับ ${result} ${targetCurrency}`)
    } else if (arrText.length === 4 && arrText[2] === 'TO') {
        const amount = arrText[Object.keys(arrText)[0]]
        const baseCurrency = arrText[Object.keys(arrText)[1]]
        const targetCurrency = arrText[Object.keys(arrText)[3]]
        const rate = await fixer.latest({ symbols: `${baseCurrency}, ${targetCurrency}` })
        const result = amount * rate.rates[targetCurrency] / rate.rates[baseCurrency]
        reply(req.body, `ตอนนี้ ${amount} ${baseCurrency} เท่ากับ ${result} ${targetCurrency}`)
    }
    else {
        return reply(req.body, 'โปรดใส่แพทเทิร์นให้ถูกต้อง')
    }
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
