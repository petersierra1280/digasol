exports.handler = async event => {
    const { getBorrowedReceipts: body, mapReceipts } = require('./utils/get_receipts_borrowed');
    // Se filtran las siguientes props: Cliente, Fecha prestamo, Cilindros y Numero recibo
    const NOTION_FILTERED_PROPS = "?filter_properties=~%60mE&filter_properties=%7C%3AWJ&filter_properties=%7C%60Gg&filter_properties=YXYo";
    const NOTION_API_URL = `https://api.notion.com/v1/databases/a054beb907b04f2ba291e45715175922/query${NOTION_FILTERED_PROPS}`
    const { NOTION_API_KEY, NOTION_API_VERSION } = process.env;

    try {
        // Obtiene los recibos prestados a clientes
        const response = await fetch(NOTION_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Content-Type': 'application/json',
                'Notion-Version': NOTION_API_VERSION
            },
            body,
        });
        const data = await response.json();
        const receipts = data.results.map(mapReceipts);
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