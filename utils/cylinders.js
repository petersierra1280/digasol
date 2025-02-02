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

const getCylindersByProvider = (providerName, cursorId, pageSize) => {
  let query = `"filter": {
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
  if (pageSize) {
    query += `, "page_size": ${pageSize}`;
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

const updateCylinderPressure = (pressure) => {
  return {
    key: 'Presion',
    value: `{
        "number": ${pressure}
    }`
  };
};

const cylindersRechargeStatus = {
  not_charged: 'Por recargar',
  in_progress: 'En recarga proveedor',
  charged: 'Recargado'
};

function mapCylinders(item, cameFrom = '') {
  const { properties, id } = item;
  const baseProps = {
    id,
    serial: properties['Serial'].title[0].plain_text
  };
  switch (cameFrom) {
    case cylindersCameFrom.inventory:
      baseProps.clase_gas = properties['Clase de gas'].select.name;
      baseProps.cantidad_producto = properties['Cantidad producto'].formula.number;
      break;
    case cylindersCameFrom.comparison: {
      const { type, date = {} } = properties['Recepcion proveedor'].formula;
      baseProps.recepcion_proveedor = type === 'date' ? date.start : '';
      baseProps.detalles_devolucion = properties['Detalles devolucion proveedor'].formula.string;
      break;
    }
    case cylindersCameFrom.receipts:
      baseProps.proveedor = properties['Proveedor']?.relation[0]?.id;
      break;
  }
  return baseProps;
}

const cylindersCameFrom = {
  inventory: 'INVENTORY',
  comparison: 'COMPARISON',
  receipts: 'RECEIPTS'
};

const cylinderProps = (cameFrom) => {
  switch (cameFrom) {
    case cylindersCameFrom.inventory:
      // Clase de gas, cantidad producto
      return ['nwIs', 'mGna', 'title'];

    case cylindersCameFrom.comparison:
      // Recepcion proveedor y Detalles devolucion proveedor
      return ['aUM%5E', 'title', 'WLxn'];

    case cylindersCameFrom.receipts:
      // ID del Proveedor
      return ['title', 'OcWI'];
  }
};

const getCylinderPressure = (unidadMedida, capacidad, claseDeGas, contenido) => {
  const cantidadProducto = {
    '1/4': 0.25,
    '3/4': 0.75,
    Lleno: 1,
    Medio: 0.5,
    Vacio: 0
  };
  let presionBase = 0;
  switch (unidadMedida) {
    case 'Kilogramos':
    case 'Kg':
      presionBase = 300;
      break;

    case 'Metros cubicos':
    case 'M3':
      if (capacidad >= 11 || ['Argon', 'Mezcla', 'AR', 'AGAMIX'].includes(claseDeGas)) {
        presionBase = 2900;
      } else {
        presionBase = 2000;
      }
      break;

    default:
      presionBase = 2000;
      break;
  }

  // Calculo en PSI de la presion del cilindro en base al contenido del frasco
  return presionBase * (cantidadProducto[contenido] || 0);
};

const mapKindOfGas = (claseDeGas) => {
  const clasesDeGases = {
    C2H2: 'Acetileno',
    AGAFIESTA: 'Agafiesta',
    AGAMIX: 'Mezcla',
    AIRE: 'Aire comprimido',
    AR: 'Argon',
    CO2: 'CO2',
    PROPANO: 'Propano',
    HE: 'Helio Alta Pureza',
    HEUAP: 'Helio Ultra Alta Pureza',
    N2: 'Nitrogeno gaseoso',
    N2LQ: 'Nitrogeno liquido',
    O2: 'Oxigeno gaseoso',
    TERMO: 'Oxigeno liquido',
    O2M: 'Oxigeno medicinal',
    O2SS: 'Oxigeno super seco'
  };
  return clasesDeGases[claseDeGas];
};

const mapUnitOfMeasurement = (unidad) => {
  const unidades = {
    M3: 'Metros cubicos',
    Kg: 'Kilogramos',
    Lt: 'Litros'
  };
  return unidades[unidad];
};

module.exports = {
  getCylindersFromReceipt,
  getCylindersByProvider,
  getCylindersBySerial,
  updateCylinderRechargeStatus,
  updateCylinderPressure,
  mapCylinders,
  cylinderProps,
  getCylinderPressure,
  mapKindOfGas,
  mapUnitOfMeasurement,
  cylindersCameFrom,
  cylindersRechargeStatus
};
