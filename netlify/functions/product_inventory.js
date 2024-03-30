exports.handler = async event => {
    const { NOTION_API_URL, NOTION_DATABASE_RECEIPTS } = process.env;
    const { notionApiHeaders: headers, mapFilteredProps } = require('./utils/index');
    const { getBorrowedReceipts, mapReceipts, receiptsFilteredProps } = require('./utils/receipts');

    const NOTION_FILTERED_PROPS = mapFilteredProps(receiptsFilteredProps);
    const RECEIPTS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_RECEIPTS}/query${NOTION_FILTERED_PROPS}`

    try {
        // Obtiene los recibos prestados a clientes
        const response = await fetch(RECEIPTS_REQUEST_URL, {
            method: 'POST',
            headers,
            body: getBorrowedReceipts,
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