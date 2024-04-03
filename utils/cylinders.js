const getCylindersFromReceipt = (receiptId) => `{
    "filter": {
        "and": [
            {
                "property": "Confirmar prestamo recibo",
                "formula": {
                    "number": {
                        "equals": 1
                    }
                }
            },
            {
                "property": "Cliente prestamo",
                "formula": {
                    "string": {
                        "is_not_empty": true
                    }
                }
            },
            {
                "property": "Recibos",
                "relation": {
                    "contains": "${receiptId}"
                }
            }
        ]
    }
}`;

const getCylindersByProvider = (providerName, cursorId) => {
    let query =
        `"filter": {
                "and": [
                    {
                        "property": "Nombre proveedor comparar",
                        "rollup": {
                            "any": {
                                "rich_text": {
                                    "contains": "${providerName}"
                                }
                            }
                        }
                    }
                ]
            }`;
    if (cursorId) {
        query += `, "start_cursor": "${cursorId}"`;
    }
    return `{ ${query} }`;
};

function mapCylinders(item, cameFrom) {
    const { properties, id } = item;
    const baseProps = {
        id,
        serial: properties["Serial"].title[0].plain_text
    }
    switch (cameFrom) {
        case 'INVENTORY':
            baseProps.clase_gas = properties["Clase de gas"].select.name;
            baseProps.cantidad_producto = properties["Cantidad producto"].formula.number;
            break;
        case 'COMPARISON':
            const { type, date = {} } = properties["Recepcion proveedor"].formula;
            baseProps.recepcion_proveedor = type === 'date' ? date.start : '';
            break;
    }
    return baseProps;
};

// Se filtran las siguientes props: Clase de gas, cantidad producto
const cylindersInventoryFilteredProps = ["nwIs", "mGna", "title"];
// Recepcion proveedor, Serial
const cylindersComparisonFilteredProps = ["aUM%5E", "title"];

module.exports = {
    getCylindersFromReceipt,
    getCylindersByProvider,
    mapCylinders,
    cylindersInventoryFilteredProps,
    cylindersComparisonFilteredProps
}