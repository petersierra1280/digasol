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

function mapCylinders(item) {
    const { properties, id } = item;
    return {
        id,
        clase_gas: properties["Clase de gas"].select.name,
        cantidad_producto: properties["Cantidad producto"].formula.number
    }
};

// Se filtran las siguientes props: Clase de gas, cantidad producto
const cylindersFilteredProps = ["nwIs", "mGna"];

module.exports = {
    getCylindersFromReceipt,
    mapCylinders,
    cylindersFilteredProps
}