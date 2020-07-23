const express = require('express')
const app = express();
const cors = require('cors');
const config = require('./functions/config.json')
const Fixer = require('fixer-node')
const fixer = new Fixer(config.accessKey_Fixer)
const symbol = require('./functions/currencyList')

const port = 8000;

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())

app.get('/', async (req, res) => {
    try {
        const obj = {
            object: {
                THB: 13,
                JPY: 16
            }
        }
    const currency = 'JPY'
    // const rate = await fixer.latest({ symbols: `${currency}, THB` })
    // const dummy = await JSON.parse(JSON.stringify(rate.rates.JPY))
    console.log(obj[currency])
    res.send(obj.object.THB)
    } catch (err) {
        res.send(err)
    }
}) 

app.listen(port, (req, res) => {
    console.log(`Listening from port ${port}`)
})