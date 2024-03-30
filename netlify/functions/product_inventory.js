exports.handler = async event => {
    const { NOTION_API_URL, NOTION_DATABASE_RECEIPTS, NOTION_DATABASE_CYLINDERS } = process.env;
    const { notionApiHeaders: headers, mapFilteredProps } = require('./utils/index');
    const { getBorrowedReceipts, mapReceipts, receiptsFilteredProps } = require('./utils/receipts');
    const { getCylindersFromReceipt, mapCylinders, cylindersFilteredProps } = require('./utils/cylinders');

    const RECEIPTS_FILTERED_PROPS = mapFilteredProps(receiptsFilteredProps);
    const RECEIPTS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_RECEIPTS}/query${RECEIPTS_FILTERED_PROPS}`

    try {
        //#region Obtiene los recibos prestados a clientes
        const response = await fetch(RECEIPTS_REQUEST_URL, {
            method: 'POST',
            headers,
            body: getBorrowedReceipts,
        });
        const receiptsData = await response.json();
        const receipts = receiptsData.results.map(mapReceipts);
        //#endregion

        //#region Obtener cilindros asociados al recibo
        const receiptsWithCylinders = await Promise.all(receipts.map(async function(receipt) {
            const CYLINDERS_FILTERED_PROPS = mapFilteredProps(cylindersFilteredProps);
            const CYLINDERS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_CYLINDERS}/query${CYLINDERS_FILTERED_PROPS}`
            const response = await fetch(CYLINDERS_REQUEST_URL, {
                method: 'POST',
                headers,
                body: getCylindersFromReceipt(receipt.id)
            });
            const cylindersData = await response.json();
            receipt.cilindros = cylindersData.results.map(mapCylinders);
            return receipt;
        }));
        //#endregion
        
        return {
            statusCode: 200,
            body: JSON.stringify(receiptsWithCylinders),
        }
    } catch (error) {
        console.log(error);
        return {
            statusCode: 500,
            body: `Failed fetching Notion data`,
        }
    }
}