const proveedores = require('./files/proveedores.json');
const clientes = require('./files/clientes.json');
const cilindros = require('./files/cilindros_full.json');

const { writeJsonFile } = require('./utils');
const { createReceiptItem } = require('../utils/receipts');

let recibosOutput = [];

cilindros.forEach(cilindro => {
    const {
        fechaentrada: fechaEntrada,
        fechasalida: fechaSalida,
        fechalimite: fechaRetorno,
        codigo: serial,
        estado
    } = cilindro;
    let { localizacion } = cilindro;

    const cliente = clientes.find(cliente => cliente["nombre"].toUpperCase() === localizacion);
    const proveedor = proveedores.find(proveedor => proveedor["nombre"].toUpperCase() === localizacion);

    const tipoPrestamo = cliente ? "CLIENTE" : (proveedor ? "PROVEEDOR" : "N/A");
    if (tipoPrestamo === 'PROVEEDOR' && localizacion === 'AGA') {
        localizacion = 'AGA (Messer Colombia S.A.)';
    }

    /*
    1. Obtener informacion del cliente/proveedor -> ID de la pagina
    2. Obtener informacion del cilindro asociado -> ID de de la pagina
    3. Crear nueva pagina para el recibo de prestamo/recarga dependiendo del tipo
    4. Actualizar el cilindro asociado -> Estado recargado
    */

    // 1. Obtener cliente/proveedor
    
    // 3. createReceiptItem

    recibosOutput.push({
        prestado_a: localizacion,
        tipo_prestamo: tipoPrestamo,
        fecha_entrada: fechaEntrada,
        fecha_salida: fechaSalida,
        fecha_retorno: fechaRetorno,
        cilindro: serial.toString(),
        estado
    });
});

writeJsonFile('recibos', recibosOutput);