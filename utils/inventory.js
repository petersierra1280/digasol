function inventoryItems(items) {
    return items.map(function (item) {
        return `{
            "property": "Orden",
            "relation": {
                "contains": "${item}"
            }
        }`;
    });
}

const getInventoryList = (items, cursorId) => {
    let query = `"filter": {
        "and": [
            {
                "or": [
                    ${inventoryItems(items)}
                ]
            }
        ]
    }`;
    if (cursorId) {
        query += `, "start_cursor": "${cursorId}"`;
    }
    return `{ ${query} }`;
};

function mapInventoryItem(item) {
    const { properties, id } = item;
    return {
        id,
        numero_recibo: parseInt(properties["Numero recibo"].formula.string)
    };
};

// Se filtran las siguientes props: Numero recibo
const inventoryFilteredProps = ["D%7B%40f"];

const createInventoryItem = (item, database_id) => {
    const { id_recibo, cantidad_producto, serial, clase_gas } = item;
    return `{
        "parent": { "database_id": "${database_id}" },
        "properties": {
            "Serial cilindro": {
                "title": [
                    {
                        "text": {
                            "content": "${serial}"
                        }
                    }
                ]
            },
            "Clase de gas": {
                "rich_text": [
                    {
                        "text": {
                            "content": "${clase_gas}"
                        }
                    }
                ]
            },
            "Total producto": { "number": ${cantidad_producto} },
            "Orden": { "relation": [{ "id": "${id_recibo}" }] }
        }
    }`;
}

module.exports = {
    getInventoryList,
    mapInventoryItem,
    inventoryFilteredProps,
    createInventoryItem
}