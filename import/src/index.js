const proveedores = require('./files/proveedores.json');
const clientes = require('./files/clientes.json');
const cilindros = require('./files/cilindros.json');

const { writeJsonFile, formatDate } = require('./utils');
const {
  getCylinderPressure,
  mapKindOfGas,
  mapUnitOfMeasurement
} = require('../../utils/cylinders');
const { CLIENTE_PARTICULAR } = require('./enums');

let cilindrosOutput = [];

cilindros.forEach((cilindro) => {
  const presion = getCylinderPressure(
    cilindro['medidas'],
    cilindro['capacidad'],
    cilindro['clase'],
    cilindro['contenido']
  );

  const pruebaHidrostatica = cilindro['p_hidrostatica'];
  const pintura = cilindro['pintura'];
  const cambioValvula = cilindro['valvulas'];

  const cilindroMapped = {
    Serial: cilindro['codigo'],
    ['Clase de gas']: mapKindOfGas(cilindro['clase']),
    Capacidad: cilindro['capacidad'],
    'Unidad de medida': mapUnitOfMeasurement(cilindro['medidas']),
    Presion: presion,
    'Cantidad producto': '',
    'Valor por dia': '',
    'Valor penalidad': '',
    'Disponible para despacho': ''
  };

  //#region Obtener proveedor/cliente propietario del cilindro
  const codigoPropietario = cilindro['cod_propietario'];
  let esCliente = codigoPropietario.charAt(0) === 'C';
  const origen = esCliente ? clientes : proveedores;
  let propietarioCilindro = origen.find((item) => item['codigo'] === codigoPropietario);
  if (!propietarioCilindro) {
    propietarioCilindro = clientes.find((cliente) => cliente['codigo'] === CLIENTE_PARTICULAR);
    esCliente = true;
  }
  const propToUpdate = esCliente ? 'Cliente' : 'Proveedor';
  cilindroMapped[propToUpdate] = propietarioCilindro['nombre'];
  cilindroMapped[propToUpdate === 'Cliente' ? 'Proveedor' : 'Cliente'] = '';
  //#endregion

  cilindroMapped['Observaciones'] = cilindro['observaciones'];

  cilindroMapped['Prueba hidrostatica'] = formatDate(pruebaHidrostatica);
  cilindroMapped['Pintura'] = formatDate(pintura);
  cilindroMapped['Cambio de valvula'] = formatDate(cambioValvula);

  cilindrosOutput.push(cilindroMapped);
});

writeJsonFile('cilindros', cilindrosOutput);
