exports.handler = async event => {
    const { NOTION_API_URL, NOTION_DATABASE_RECEIPTS } = process.env;
    const { notionApiHeaders: headers, getBorrowedReceipts: body, mapReceipts } = require('./utils/get_receipts_borrowed');

    // Se filtran las siguientes props: Cliente, Fecha prestamo, Cilindros y Numero recibo
    const filteredProps = ["~%60mE", "%7C%3AWJ", "%7C%60Gg", "YXYo"];
    const NOTION_FILTERED_PROPS = filteredProps.map(function (prop, index) {
        const prefix = index === 0 ? '?' : '&';
        return `${prefix}filter_properties=${prop}`;
    }).join('');

    const REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_RECEIPTS}/query${NOTION_FILTERED_PROPS}`

    try {
        // Obtiene los recibos prestados a clientes
        const response = await fetch(REQUEST_URL, {
            method: 'POST',
            headers,
            body,
        });
        const receiptsData = await response.json();
        const receipts = receiptsData.results.map(mapReceipts);
        return {
            statusCode: 200,
            body: JSON.stringify(receipts),
        }
    } catch (error) {
        console.log(error);
        return {
            statusCode: 500,
            body: `Failed fetching Notion data`,
        }
    }
}