const proveedores = require('./files/proveedores.json');
const clientes = require('./files/clientes.json');
const cilindros = require('./files/cilindros_full.json');

const { writeJsonFile } = require('./utils');
const { mapFilteredProps, notionApiHeaders: headers } = require('../utils/index');
const { tipoPrestamo: prestamos } = require('../utils/receipts');

const {
    NOTION_API_URL,
    NOTION_DATABASE_CLIENTS,
    NOTION_DATABASE_PROVIDERS,
    NOTION_DATABASE_CYLINDERS,
    NOTION_DATABASE_RECEIPTS
} = process.env;

let recibosOutput = [];

//#region Funciones para aplicar operaciones con las diferentes entidades en Notion

const getClientInformation = async (clientName) => {
    const { clientsFilteredProps, getClientsByName, mapClients } = require('../utils/clients');
    const CLIENTS_FILTERED_PROPS = mapFilteredProps(clientsFilteredProps);
    const CLIENTS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_CLIENTS}/query${CLIENTS_FILTERED_PROPS}`;

    const responseClient = await fetch(CLIENTS_REQUEST_URL, {
        keepalive: true,
        method: 'POST',
        headers,
        body: getClientsByName(clientName)
    });
    const clientsData = await responseClient.json();
    return clientsData.results.map(mapClients)[0];
}

const getProviderInformation = async (providerName) => {
    const { providersFilteredProps, getProvidersByName, mapProviders, getProvidersByName } = require('../utils/providers');
    const PROVIDERS_FILTERED_PROPS = mapFilteredProps(providersFilteredProps);
    const PROVIDERS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_PROVIDERS}/query${PROVIDERS_FILTERED_PROPS}`;

    const responseProvider = await fetch(PROVIDERS_REQUEST_URL, {
        keepalive: true,
        method: 'POST',
        headers,
        body: getProvidersByName(providerName)
    });
    const providersData = await responseProvider.json();
    return providersData.results.map(mapProviders)[0];
}

const getCylinderInformation = async (serial) => {
    const { cylinderProps, getCylindersBySerial, mapCylinders, cylindersCameFrom } = require('../utils/cylinders');
    const CYLINDERS_FILTERED_PROPS = mapFilteredProps(cylinderProps(cylindersCameFrom.receipts));
    const CYLINDERS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_CYLINDERS}/query${CYLINDERS_FILTERED_PROPS}`;

    const responseCylinder = await fetch(CYLINDERS_REQUEST_URL, {
        keepalive: true,
        method: 'POST',
        headers,
        body: getCylindersBySerial(serial)
    });
    const cylindersData = await responseCylinder.json();
    return cylindersData.results.map(item => mapCylinders(item, cylindersCameFrom.receipts))[0];
}

const createReceipt = async (receiptItem) => {
    const { createReceiptItem } = require('../utils/receipts');
    await fetch(`${NOTION_API_URL}/pages`, {
        keepalive: true,
        method: 'POST',
        headers,
        body: createReceiptItem(receiptItem, NOTION_DATABASE_RECEIPTS)
    });
}

//#endregion

cilindros.forEach(async cilindro => {
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

    const tipoPrestamo = cliente ? prestamos.cliente : (proveedor ? prestamos.proveedor : "N/A");
    if (tipoPrestamo === prestamos.proveedor && localizacion === 'AGA') {
        localizacion = 'AGA (Messer Colombia S.A.)';
    }

    //#region Proceso de importacion de los recibos

    // 1. Obtener informacion del cliente/proveedor -> ID de la pagina
    let entityInfo, entityId;
    switch (tipoPrestamo) {
        case prestamos.cliente:
            entityInfo = await getClientInformation(localizacion);
            break;

        case prestamos.proveedor:
            entityInfo = await getProviderInformation(localizacion);
            break;
    }
    entityId = entityInfo?.id;

    // 2. Obtener informacion del cilindro asociado -> ID de de la pagina
    let cylinderId = (await getCylinderInformation(serial))?.id;

    // 3. Crear nueva pagina para el recibo de prestamo/recarga dependiendo del tipo
    const receiptItem = {
        tipo_prestamo: tipoPrestamo,
        fecha_prestamo: fechaSalida, // TODO: Validar la fecha cuando el prestamo ya se ha finalizado
        fecha_limite: fechaRetorno, // TODO: Verificar los casos donde NO hay fecha retorno
        cilindros: [{ serial }],
        confirmar_prestamo: true
    }
    receiptItem[tipoPrestamo === prestamos.cliente ? 'cliente_id' : 'proveedor_id'] = entityId;
    await createReceipt(receiptItem);

    // 4. Actualizar el cilindro asociado -> Estado recargado (siempre y cuando el prestamo este en progreso)

    //TODO: implement method

    //#endregion

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

// TODO: remove this implementation (no longer needed)
writeJsonFile('recibos', recibosOutput);