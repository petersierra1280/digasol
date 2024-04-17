//#region Import references
const {
    NOTION_API_URL,
    NOTION_DATABASE_RECEIPTS,
    NOTION_DATABASE_CYLINDERS,
    NOTION_DATABASE_INVENTORY
} = process.env;
const { notionApiHeaders: headers, mapFilteredProps } = require('../../utils/index');
const {
    getBorrowedReceipts,
    mapReceipts,
    receiptsFilteredProps
} = require('../../utils/receipts');
const {
    getCylindersFromReceipt,
    mapCylinders,
    cylindersInventoryFilteredProps
} = require('../../utils/cylinders');
const {
    createInventoryItem
} = require('../../utils/inventory');
//#endregion

//#region Obtiene los recibos prestados a clientes sin inventario
const getReceiptsWithoutInventory = async () => {
    const RECEIPTS_FILTERED_PROPS = mapFilteredProps(receiptsFilteredProps);
    const RECEIPTS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_RECEIPTS}/query${RECEIPTS_FILTERED_PROPS}`

    const responseReceipts = await fetch(RECEIPTS_REQUEST_URL, {
        keepalive: true,
        method: 'POST',
        headers,
        body: getBorrowedReceipts
    });
    const receiptsData = await responseReceipts.json();
    return receiptsData.results.map(mapReceipts);
}
//#endregion

//#region Obtener cilindros asociados al recibo
const getReceiptsWithCylinders = async (receiptsWithoutInventory) => {
    return await Promise.all(receiptsWithoutInventory.map(async function (receipt) {
        const CYLINDERS_FILTERED_PROPS = mapFilteredProps(cylindersInventoryFilteredProps);
        const CYLINDERS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_CYLINDERS}/query${CYLINDERS_FILTERED_PROPS}`
        const responseCylinders = await fetch(CYLINDERS_REQUEST_URL, {
            keepalive: true,
            method: 'POST',
            headers,
            body: getCylindersFromReceipt(receipt.id)
        });
        const cylindersData = await responseCylinders.json();
        receipt.cilindros = cylindersData.results.map(item => mapCylinders(item, 'INVENTORY'));
        return receipt;
    }));
}
//#endregion

//#region Crear inventario de ventas
const createInventoryForReceipts = async (receipts) => {
    await Promise.all(receipts.map(async receipt => {
        const { cilindros, id: id_recibo } = receipt;
        const baseInfo = {
            id_recibo
        };
        const inventoryInfo = cilindros.map(cilindro => {
            const { clase_gas, cantidad_producto, serial } = cilindro;
            return {
                ...baseInfo,
                serial,
                clase_gas,
                cantidad_producto
            }
        });
        await Promise.all(inventoryInfo.map(async item => {
            await fetch(`${NOTION_API_URL}/pages`, {
                keepalive: true,
                method: 'POST',
                headers,
                body: createInventoryItem(item, NOTION_DATABASE_INVENTORY)
            });
        }));
    }));
}
//#endregion

exports.handler = async event => {
    try {
        const receiptsWithoutInventory = await getReceiptsWithoutInventory();
        let receiptsSummary = [];
        if (receiptsWithoutInventory && receiptsWithoutInventory.length > 0) {
            receiptsSummary = await getReceiptsWithCylinders(receiptsWithoutInventory);
            await createInventoryForReceipts(receiptsSummary);
        }

        return {
            statusCode: 200,
            body: JSON.stringify(receiptsSummary),
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: `Failed fetching Notion data`,
        }
    }
}