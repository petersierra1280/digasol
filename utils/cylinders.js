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

const getCylindersBySerial = (serial) => `{
    "filter": {
        "and": [
            {
                "property": "Serial",
                "rich_text": {
                    "equals": "${serial}"
                }
            }
        ]
    }
}`;

const updateCylinderRechargeStatus = (rechargeStatus) => `{
    "properties": {
        "Recarga": {
            "status": {
                "name": "${rechargeStatus}"
            }
        }
    }
}`;

const cylindersRechargeStatus = {
    not_charged: "Por recargar",
    in_progress: "En recarga proveedor",
    charged: "Recargado"
}

const markCylinderAsRecharged = () => updateCylinderRechargeStatus(cylindersRechargeStatus.charged);
const markCylinderAsNotRecharged = () => updateCylinderRechargeStatus(cylindersRechargeStatus.not_charged);

function mapCylinders(item, cameFrom) {
    const { properties, id } = item;
    const baseProps = {
        id,
        serial: properties["Serial"].title[0].plain_text
    };
    switch (cameFrom) {
        case cylindersCameFrom.inventory:
            baseProps.clase_gas = properties["Clase de gas"].select.name;
            baseProps.cantidad_producto = properties["Cantidad producto"].formula.number;
            break;
        case cylindersCameFrom.comparison:
            const { type, date = {} } = properties["Recepcion proveedor"].formula;
            baseProps.recepcion_proveedor = type === 'date' ? date.start : '';
            baseProps.detalles_devolucion = properties["Detalles devolucion proveedor"].formula.string;
            break;
        case cylindersCameFrom.receipts:
            baseProps.proveedor = properties["Proveedor"].relation[0].id;
            break;
    }
    return baseProps;
};

const cylindersCameFrom = {
    inventory: 'INVENTORY',
    comparison: 'COMPARISON',
    receipts: 'RECEIPTS'
}

const cylinderProps = (cameFrom) => {
    switch (cameFrom) {
        case cylindersCameFrom.inventory:
            // Clase de gas, cantidad producto
            return ["nwIs", "mGna", "title"];

        case cylindersCameFrom.comparison:
            // Recepcion proveedor y Detalles devolucion proveedor
            return ["aUM%5E", "title", "WLxn"];

        case cylindersCameFrom.receipts:
            // ID del Proveedor
            return ["title", "OcWI"];
    }
};

module.exports = {
    getCylindersFromReceipt,
    getCylindersByProvider,
    getCylindersBySerial,
    markCylinderAsRecharged,
    markCylinderAsNotRecharged,
    mapCylinders,
    cylinderProps,
    cylindersCameFrom
}