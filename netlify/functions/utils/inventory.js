function inventoryItems(items) {
    return items.map(function (item) {
        return `{
            "property": "Numero recibo",
            "number": {
                "equals": ${item}
            }
        }`;
    });
}

const getInventoryList = (items) => `{
    "filter": {
        "and": [
            {
                "or": [
                    ${inventoryItems(items)}
                ]
            }
        ]
    }
}`;

function mapInventoryItem(item) {
    const { properties, id } = item;
    return {
        id,
        numero_recibo: properties["Numero recibo"].number
    }
};

// Se filtran las siguientes props: Numero recibo
const inventoryFilteredProps = ["D%7B%40f"];

const createInventoryItem = (item, database_id) => {
    const { cliente, fecha_venta, numero_recibo, cantidad_producto, serial, clase_gas } = item;
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
            "Cliente": {
                "rich_text": [
                    {
                        "text": {
                            "content": "${cliente}"
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
            "Numero recibo": { "number": ${numero_recibo} },
            "Total producto": { "number": ${cantidad_producto} },
            "Fecha venta": { "date": { "start": "${fecha_venta}" } }
        }
    }`;
}

module.exports = {
    getInventoryList,
    mapInventoryItem,
    inventoryFilteredProps,
    createInventoryItem
}