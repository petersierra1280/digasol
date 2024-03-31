//#region Import references
const { NOTION_API_URL, NOTION_DATABASE_RECEIPTS, NOTION_DATABASE_CYLINDERS, NOTION_DATABASE_INVENTORY } = process.env;
const { notionApiHeaders: headers, mapFilteredProps } = require('./utils/index');
const { getBorrowedReceipts, mapReceipts, receiptsFilteredProps } = require('./utils/receipts');
const { getCylindersFromReceipt, mapCylinders, cylindersFilteredProps } = require('./utils/cylinders');
const { getInventoryList, mapInventoryItem, inventoryFilteredProps } = require('./utils/inventory');
//#endregion

//#region Obtiene los recibos prestados a clientes
const getReceipts = async () => {
    const RECEIPTS_FILTERED_PROPS = mapFilteredProps(receiptsFilteredProps);
    const RECEIPTS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_RECEIPTS}/query${RECEIPTS_FILTERED_PROPS}`

    const responseReceipts = await fetch(RECEIPTS_REQUEST_URL, {
        method: 'POST',
        headers,
        body: getBorrowedReceipts,
    });
    const receiptsData = await responseReceipts.json();
    return receiptsData.results.map(mapReceipts);
}
//#endregion

//#region Buscar recibos sin inventario
const getReceiptsWithoutInventory = async (receipts) => {
    const INVENTORY_FILTERED_PROPS = mapFilteredProps(inventoryFilteredProps);
    const INVENTORY_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_INVENTORY}/query${INVENTORY_FILTERED_PROPS}`

    const receiptsList = receipts.map(receipt => receipt.numero_recibo);
    const responseInventory = await fetch(INVENTORY_REQUEST_URL, {
        method: 'POST',
        headers,
        body: getInventoryList(receiptsList),
    });
    const inventoryData = await responseInventory.json();
    const inventoryList = inventoryData.results.map(mapInventoryItem);

    const receiptsWithoutInventory = [];
    receipts.forEach(item => {
        const result = inventoryList.find(inventory => inventory.numero_recibo == item.numero_recibo);
        if (!result) {
            receiptsWithoutInventory.push(item);
        }
    });
    return receiptsWithoutInventory;
}
//#endregion

//#region Obtener cilindros asociados al recibo
const getReceiptsWithCylinders = async (receiptsWithoutInventory) => {
    return await Promise.all(receiptsWithoutInventory.map(async function (receipt) {
        const CYLINDERS_FILTERED_PROPS = mapFilteredProps(cylindersFilteredProps);
        const CYLINDERS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_CYLINDERS}/query${CYLINDERS_FILTERED_PROPS}`
        const responseCylinders = await fetch(CYLINDERS_REQUEST_URL, {
            method: 'POST',
            headers,
            body: getCylindersFromReceipt(receipt.id)
        });
        const cylindersData = await responseCylinders.json();
        receipt.cilindros = cylindersData.results.map(mapCylinders);
        return receipt;
    }));
}
//#endregion

exports.handler = async event => {
    try {
        const receiptsBaseList = await getReceipts();
        const receiptsWithoutInventory = await getReceiptsWithoutInventory(receiptsBaseList);
        const receiptsCompleteList = await getReceiptsWithCylinders(receiptsWithoutInventory);

        return {
            statusCode: 200,
            body: JSON.stringify(receiptsCompleteList),
        }
    } catch (error) {
        console.log(error);
        return {
            statusCode: 500,
            body: `Failed fetching Notion data`,
        }
    }
}