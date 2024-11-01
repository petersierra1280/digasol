const { TZ = 'America/Bogota' } = process.env;

const { daysBetween, formatDateWithTime } = require('../utils/index');

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

const getReceiptsByCylinder = (cylinderPageId) => `{
    "filter": {
        "and": [
            {
                "property": "Cilindros",
                "relation": {
                    "contains": "${cylinderPageId}"
                }
            }
        ]
    }
}`;

function mapReceipts(item) {
  const { properties, id } = item;
  return {
    id,
    numero_recibo: properties['Numero recibo'].unique_id.number,
    cilindros: properties['Cilindros']?.relation[0]?.id
  };
}

// Se filtran las siguientes props: ID, Numero recibo y Cilindros
const receiptsFilteredProps = ['YXYo', '%7C%60Gg'];

const createReceiptItem = (item, database_id) => {
  const {
    tipo_prestamo,
    fecha_prestamo,
    fecha_limite = '',
    cliente_id = '',
    proveedor_id = '',
    cilindros,
    confirmar_prestamo = false,
    fecha_recepcion,
    cobrar_arriendo = false
  } = item;

  if (!fecha_prestamo) {
    return '';
  }

  let title;
  switch (tipo_prestamo) {
    case tipoPrestamo.cliente:
      title = `Recibo prestamo - import - ${fecha_prestamo}`;
      break;
    case tipoPrestamo.proveedor:
      title = `Recibo recarga proveedor - import - ${fecha_prestamo}`;
      break;
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
                    "start": "${formatDateWithTime(fecha_prestamo)}", "time_zone": "${TZ}"
                }
            },
            ${
              fecha_recepcion
                ? `"Fecha recepcion": {
                "date": { "start": "${formatDateWithTime(fecha_recepcion)}", "time_zone": "${TZ}" }
            },`
                : ''
            }
            ${
              cliente_id
                ? `"Cobrar arriendo": {
                 "select": { "name": "${cobrar_arriendo ? 'Si' : 'No'}" }
            },`
                : ''
            }
            ${
              cliente_id
                ? `"Cliente": {
                "relation": [{ "id": "${cliente_id}" }]
            },`
                : ''
            }
            ${
              proveedor_id
                ? `"Proveedor": {
                "relation": [{ "id": "${proveedor_id}" }]
            },`
                : ''
            }
            ${
              diferencia_dias > 0
                ? `"Dias retorno": {
                "Number": ${diferencia_dias}
            },`
                : ''
            }
            "Cilindros": {
                "relation": [ ${cilindros.map((cilindro) => `{ "id": "${cilindro}" }`)} ]
            },
            "Prestado a cliente": {
                "checkbox": ${confirmar_prestamo}
            }
        }
    }`;
};

const tipoPrestamo = {
  cliente: 'CLIENTE',
  proveedor: 'PROVEEDOR'
};

module.exports = {
  getBorrowedReceipts,
  mapReceipts,
  receiptsFilteredProps,
  createReceiptItem,
  tipoPrestamo,
  getReceiptsByCylinder
};
