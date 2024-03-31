//#region Import references
const { NOTION_API_URL, NOTION_DATABASE_RECEIPTS, NOTION_DATABASE_CYLINDERS, NOTION_DATABASE_INVENTORY } = process.env;
const { notionApiHeaders: headers, mapFilteredProps } = require('./utils/index');
const { getBorrowedReceipts, mapReceipts, receiptsFilteredProps } = require('./utils/receipts');
const { getCylindersFromReceipt, mapCylinders, cylindersFilteredProps } = require('./utils/cylinders');
const { getInventoryList, mapInventoryItem, inventoryFilteredProps, createInventoryItem } = require('./utils/inventory');
//#endregion

//#region Obtiene los recibos prestados a clientes
const getReceipts = async () => {
    const RECEIPTS_FILTERED_PROPS = mapFilteredProps(receiptsFilteredProps);
    const RECEIPTS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_RECEIPTS}/query${RECEIPTS_FILTERED_PROPS}`

    const responseReceipts = await fetch(RECEIPTS_REQUEST_URL, {
        method: 'POST',
        headers,
        body: getBorrowedReceipts
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
        body: getInventoryList(receiptsList)
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

//#region Crear inventario de ventas
const createInventoryForReceipts = async (receipts) => {
    Promise.all(receipts.map(async receipt => {
        const { cliente: { nombre: nombre_cliente }, fecha_prestamo: fecha_venta, numero_recibo, total_pagar, cilindros } = receipt;
        const baseInfo = {
            cliente: nombre_cliente,
            fecha_venta,
            numero_recibo,
            total_pagar
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
        const receiptsBaseList = await getReceipts();
        const receiptsWithoutInventory = await getReceiptsWithoutInventory(receiptsBaseList);
        const receiptsCompleteList = await getReceiptsWithCylinders(receiptsWithoutInventory);
        await createInventoryForReceipts(receiptsCompleteList);

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