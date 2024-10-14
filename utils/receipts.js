const { daysBetween } = require('../utils/index');

const getBorrowedReceipts = `{
    "filter": {
        "and": [
            {
                "property": "Prestado a cliente",
                "checkbox": {
                    "equals": true
                }
            },
            {
                "property": "Cliente",
                "relation": {
                    "is_not_empty": true
                }
            },
            {
                "property": "Proveedor",
                "relation": {
                    "is_empty": true
                }
            },
            {
                "property": "Cilindros",
                "relation": {
                    "is_not_empty": true
                }
            },
            {
                "property": "Inventario",
                "relation": {
                    "is_empty": true
                }
            }
        ]
    }
}`;

function mapReceipts(item) {
    const { properties, id } = item;
    return {
        id,
        numero_recibo: properties["Numero recibo"].unique_id.number
    };
};

// Se filtran las siguientes props: ID y Numero recibo
const receiptsFilteredProps = ["YXYo"];

const createReceiptItem = (item, database_id) => {
    const {
        tipo_prestamo,
        fecha_prestamo,
        fecha_limite = '',
        cliente_id = '',
        proveedor_id = '',
        cilindros,
        confirmar_prestamo = false
    } = item;

    if (fecha_salida !== '') {
        return '';
    }

    let title;
    switch (tipo_prestamo) {
        case tipoPrestamo.cliente:
            title = `Recibo prestamo - import - ${fecha_prestamo}`;
            break;
        case tipoPrestamo.proveedor:
            title = `Recibo recarga proveedor - import - ${fecha_prestamo}`;
    }

    let diferencia_dias = 0;
    if (fecha_limite && tipo_prestamo === tipoPrestamo.cliente) {
        diferencia_dias = daysBetween(new Date(fecha_prestamo), new Date(fecha_limite));
    }

    return `{
        "parent": { "database_id": "${database_id}" },
        "properties": {
            "Prestamo": {
                "title": [
                    {
                        "text": {
                            "content": "${title}"
                        }
                    }
                ]
            },
            "Fecha prestamo": {
                "date": {
                    "start": ${fecha_prestamo}
                }
            },
            ${cliente_id && `"Cliente": {
                "relation": [{ "id": ${cliente_id} }]
            },` }
            ${proveedor_id && `"Proveedor": {
                "relation": [{ "id": ${proveedor_id} }]
            },` }
            ${diferencia_dias > 0 && `"Dias retorno": {
                "Number": ${diferencia_dias}
            },` }
            "Cilindros": {
                "relation": [ ${cilindros.map(cilindro => `{ "id": ${cilindro} }`)} ]
            },
            "Prestado a cliente": {
                "checkbox": ${confirmar_prestamo}
            }
        }
    }`;
}

const tipoPrestamo = {
    cliente: 'CLIENTE',
    proveedor: 'PROVEEDOR'
}

module.exports = {
    getBorrowedReceipts,
    mapReceipts,
    receiptsFilteredProps,
    createReceiptItem,
    tipoPrestamo
}