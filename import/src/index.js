const proveedores = require('./files/proveedores.json');
const clientes = require('./files/clientes.json');
const cilindros = require('./files/cilindros.json');

const { writeJsonFile } = require('./utils');
const { CLIENTE_PARTICULAR } = require('./enums');

let cilindrosOutput = [];

cilindros.forEach((cilindro) => {
  //#region  Calcular presion del cilindro
  let presionBase = 0;
  switch (cilindro['Unidad de medida']) {
    case 'Kilogramos':
      presionBase = 300;
      break;

    case 'Metros cubicos':
      if (cilindro['Capacidad'] >= 11 || ['Argon', 'Mezcla'].includes(cilindro['Clase de gas'])) {
        presionBase = 2900;
      } else {
        presionBase = 2000;
      }
      break;

    default:
      presionBase = 2000;
      break;
  }

  const cantidadProducto = {
    '1/4': 0.25,
    '3/4': 0.75,
    Lleno: 1,
    Medio: 0.5,
    Vacio: 0
  };
  // Calculo en PSI de la presion del cilindro en base al contenido del frasco
  cilindro['Presion'] = presionBase * cantidadProducto[cilindro['Contenido']];
  //#endregion

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
