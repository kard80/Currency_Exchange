export function isNumber(input) {
    return input * 0 === 0
}

export function modifiedOutput(input) {
    const result = {
        baseAmount: 1,
        baseCurrency: 'USD',
        targetAmount: 0,
        targetCurrency: 'THB',
    };

    for (let key in input) {
        result[key] = input[key];
    };

    return `ตอนนี้ ${result.amount} ${result.baseCurrency} เท่ากับ ${result.targetAmount} ${result.targetCurrency}`;
}