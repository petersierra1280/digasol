const proveedores = require('./files/proveedores.json');
const clientes = require('./files/clientes.json');
const cilindros = require('./files/cilindros.json');

const { writeJsonFile } = require('./utils');
const { getCylinderPressure } = require('../../utils/cylinders');
const { CLIENTE_PARTICULAR } = require('./enums');

let cilindrosOutput = [];

cilindros.forEach((cilindro) => {
  cilindro['Presion'] = getCylinderPressure(
    cilindro['Unidad de medida'],
    cilindro['Capacidad'],
    cilindro['Clase de gas'],
    cilindro['Contenido']
  );

  //#region Obtener proveedor/cliente propietario del cilindro
  const codigoProveedor = cilindro['CodigoProveedor'];
  const esCliente = codigoProveedor.charAt(0) === 'C';
  const origen = esCliente ? clientes : proveedores;
  let propietarioCilindro = origen.find((item) => item['codigo'] === codigoProveedor);
  if (!propietarioCilindro) {
    propietarioCilindro = clientes.find((cliente) => cliente['codigo'] === CLIENTE_PARTICULAR);
  }
  cilindro[esCliente ? 'Cliente' : 'Proveedor'] = propietarioCilindro['nombre'];
  //#endregion

  cilindrosOutput.push(cilindro);
});

writeJsonFile('cilindros', cilindrosOutput);
