require('dotenv').config({ path: `../../.env` });

const proveedores = require('./files/proveedores.json');
const clientes = require('./files/clientes.json');
const cilindros = require('./files/cilindros_full.json');

const {
  writeJsonFile,
  removeJsonFile,
  sleep,
  validateStringDate,
  isCylinderInDigasol,
  getProcessDurationInMins
} = require('./utils');
const {
  SLEEP_TIMEOUT,
  CAMBIO_CILINDRO,
  MAX_RETRY_ATTEMPTS,
  HTTP_CONFLICT_ERROR,
  receiptStatus,
  providersFromImport
} = require('./enums');
const { mapFilteredProps, notionApiHeaders: headers } = require('../../utils/index');
const { tipoPrestamo: prestamos } = require('../../utils/receipts');

const {
  NOTION_API_URL,
  NOTION_DATABASE_CLIENTS,
  NOTION_DATABASE_PROVIDERS,
  NOTION_DATABASE_CYLINDERS,
  NOTION_DATABASE_RECEIPTS,
  NOTION_DATABASE_INVENTORY
} = process.env;

(async () => {
  const separador = '-----------';

  //#region Funciones globales

  const { getCylinderPressure, cylindersRechargeStatus } = require('../../utils/cylinders');

  const updateCylinderStatus = async (
    cylinderPageId,
    chargeStatus = cylindersRechargeStatus.charged,
    pressure
  ) => {
    const {
      updateCylinderRechargeStatus,
      updateCylinderPressure
    } = require('../../utils/cylinders');
    let body = updateCylinderRechargeStatus(chargeStatus);
    if (pressure) {
      const { key, value: pressureValue } = updateCylinderPressure(pressure);
      body = JSON.parse(body);
      body.properties[key] = JSON.parse(pressureValue);
      body = JSON.stringify(body);
    }

    let attempt = 0;

    while (attempt < MAX_RETRY_ATTEMPTS) {
      const result = await fetch(`${NOTION_API_URL}/pages/${cylinderPageId}`, {
        keepalive: true,
        method: 'PATCH',
        headers,
        body
      });
      if (result.ok) {
        console.log('Estado del cilindro actualizado exitosamente');
        return;
      } else if (result.status === HTTP_CONFLICT_ERROR) {
        attempt++;
        console.warn(
          `Conflicto al intentar actualizar el cilindro. Intento ${attempt} de ${MAX_RETRY_ATTEMPTS}.`
        );

        if (attempt < MAX_RETRY_ATTEMPTS) {
          await sleep();
          continue;
        } else {
          console.error('Se alcanzo el maximo de intentos para actualizar el estado del cilindro');
        }
      } else {
        console.error(
          'Error actualizando el estado del cilindro. Response: ',
          result.status,
          result.statusText
        );
        console.error('Request body: ', body);
        const errorBody = await result.text();
        console.error('Response body: ', errorBody);
        break;
      }
    }
  };

  //#endregion

  const importProcess = async () => {
    const recibosErrorOutput = [],
      clientsList = [],
      providersList = [];

    //#region Funciones para aplicar operaciones con las entidades en Notion - Importar recibos

    const getClientInformation = async (clientName) => {
      const clientExistent = clientsList.find((client) => client && client.nombres === clientName);

      if (clientExistent) {
        return clientExistent;
      }

      const { clientsFilteredProps, getClientsByName, mapClients } = require('../../utils/clients');
      const CLIENTS_FILTERED_PROPS = mapFilteredProps(clientsFilteredProps);
      const CLIENTS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_CLIENTS}/query${CLIENTS_FILTERED_PROPS}`;

      const responseClient = await fetch(CLIENTS_REQUEST_URL, {
        keepalive: true,
        method: 'POST',
        headers,
        body: getClientsByName(clientName)
      });
      const clientsData = await responseClient.json();
      const client = clientsData.results.map(mapClients)[0];
      clientsList.push(client);
      return client;
    };

    const getProviderInformation = async (providerName) => {
      const providerExistent = providersList.find(
        (provider) => provider && provider.nombres === providerName
      );

      if (providerExistent) {
        return providerExistent;
      }

      const {
        providersFilteredProps,
        getProvidersByName,
        mapProviders
      } = require('../../utils/providers');
      const PROVIDERS_FILTERED_PROPS = mapFilteredProps(providersFilteredProps);
      const PROVIDERS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_PROVIDERS}/query${PROVIDERS_FILTERED_PROPS}`;

      const responseProvider = await fetch(PROVIDERS_REQUEST_URL, {
        keepalive: true,
        method: 'POST',
        headers,
        body: getProvidersByName(providerName)
      });
      const providersData = await responseProvider.json();
      const provider = providersData.results.map(mapProviders)[0];
      providersList.push(provider);
      return provider;
    };

    const getCylinderInformation = async (serial) => {
      const {
        cylinderProps,
        getCylindersBySerial,
        mapCylinders,
        cylindersCameFrom
      } = require('../../utils/cylinders');
      const CYLINDERS_FILTERED_PROPS = mapFilteredProps(cylinderProps(cylindersCameFrom.receipts));
      const CYLINDERS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_CYLINDERS}/query${CYLINDERS_FILTERED_PROPS}`;

      const responseCylinder = await fetch(CYLINDERS_REQUEST_URL, {
        keepalive: true,
        method: 'POST',
        headers,
        body: getCylindersBySerial(serial)
      });
      const cylindersData = await responseCylinder.json();
      return cylindersData.results.map((item) => mapCylinders(item, cylindersCameFrom.receipts))[0];
    };

    const createReceipt = async (receiptItem) => {
      const { createReceiptItem } = require('../../utils/receipts');
      const body = createReceiptItem(receiptItem, NOTION_DATABASE_RECEIPTS);
      if (!body) {
        console.warn('No se obtuvo informacion del recibo a crear. Omitiendo registro...');
      }
      const result = await fetch(`${NOTION_API_URL}/pages`, {
        keepalive: true,
        method: 'POST',
        headers,
        body
      });
      if (!result.ok) {
        console.error('Error creando recibo. Response: ', result.status, result.statusText);
        console.error('Request body: ', body);
        const errorBody = await result.text();
        console.error('Response body: ', errorBody);
      } else {
        console.log('Recibo creado exitosamente');
      }
    };

    const getReceiptListByCylinder = async (cylinderPageId) => {
      const {
        mapReceipts,
        getReceiptsByCylinder,
        receiptsFilteredProps
      } = require('../../utils/receipts');
      const RECEIPTS_FILTERED_PROPS = mapFilteredProps(receiptsFilteredProps);
      const RECEIPTS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_RECEIPTS}/query${RECEIPTS_FILTERED_PROPS}`;
      const response = await fetch(RECEIPTS_REQUEST_URL, {
        keepalive: true,
        method: 'POST',
        headers,
        body: getReceiptsByCylinder(cylinderPageId)
      });
      const data = await response.json();
      return data.results?.map(mapReceipts);
    };

    //#endregion

    console.log(`${cilindros.length} total de cilindros encontrados por procesar...`);
    let index = 1;
    const startTime = Date.now();

    for (const cilindro of cilindros) {
      const {
        fechaentrada: fechaEntrada,
        fechasalida: fechaSalida,
        fechalimite: fechaRetorno,
        estado,
        medidas: unidadMedida,
        capacidad,
        clase: claseDeGas,
        contenido
      } = cilindro;
      let { localizacion, codigo: serial } = cilindro;
      serial = serial.toString();

      if (localizacion === CAMBIO_CILINDRO) {
        console.log(`Omitiendo cilindro ${serial}, no se encuentra prestado - cambio de cilindro`);
        console.log(separador);
        continue;
      }

      console.log(`${index}) Procesando cilindro: ${serial}`);
      index++;

      const cliente = clientes.find((cliente) => cliente['nombre'].toUpperCase() === localizacion);
      const proveedor = proveedores.find(
        (proveedor) => proveedor['nombre'].toUpperCase() === localizacion
      );

      const tipoPrestamo = cliente ? prestamos.cliente : proveedor ? prestamos.proveedor : 'N/A';
      if (tipoPrestamo === prestamos.proveedor && providersFromImport[localizacion]) {
        localizacion = providersFromImport[localizacion];
      }
      try {
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

          case 'N/A':
            throw new Error(`No se encontro el cliente o proveedor: ${localizacion}`);
        }
        entityId = entityInfo?.id;

        // 2. Obtener informacion del cilindro asociado -> ID de de la pagina
        const cylinderInfo = await getCylinderInformation(serial);
        const cylinderPageId = cylinderInfo?.id;

        const existsReceipt = await getReceiptListByCylinder(cylinderPageId);
        if (existsReceipt && existsReceipt.length > 0) {
          console.log(`Omitiendo cilindro ${serial}, ya tiene un recibo creado`);
          console.log(separador);
          continue;
        }

        // 3. Crear nueva pagina para el recibo de prestamo/recarga dependiendo del tipo
        const cilindroEnDigasol = isCylinderInDigasol(localizacion);
        const confirmarPrestamo = estado === receiptStatus.no_disponible && !cilindroEnDigasol; // Si el cilindro esta no en Digasol o no esta disponible, el prestamo esta activo
        const fechaRecepcionProveedor = !confirmarPrestamo ? validateStringDate(fechaEntrada) : '';
        const receiptItem = {
          tipo_prestamo: tipoPrestamo,
          fecha_prestamo: validateStringDate(fechaSalida),
          fecha_limite: validateStringDate(fechaRetorno, false),
          fecha_recepcion: fechaRecepcionProveedor,
          cilindros: [cylinderPageId],
          confirmar_prestamo: confirmarPrestamo,
          cobrar_arriendo: false // No se marcaran para cobrar arriendo, ya que ningun cilindro tiene el valor por dia configurado
        };
        const {
          in_progress: rechargeInProgress,
          charged: recharged,
          not_charged: notCharged
        } = cylindersRechargeStatus;
        let estadoRecargaCilindro = confirmarPrestamo
          ? tipoPrestamo === prestamos.proveedor
            ? rechargeInProgress
            : recharged
          : notCharged;
        if (!confirmarPrestamo && cylinderInfo.proveedor) {
          // Sobreescribe el ID del proveedor para referenciar la recepcion de un cilindro de parte del proveedor
          entityId = cylinderInfo.proveedor;
        }
        receiptItem[tipoPrestamo === prestamos.cliente ? 'cliente_id' : 'proveedor_id'] = entityId;

        await createReceipt(receiptItem);

        // 4. Actualizar el cilindro asociado -> Estado recargado (siempre y cuando el prestamo este en progreso) | actualizar la presion mas reciente
        const cylinderPressure = getCylinderPressure(
          unidadMedida,
          capacidad,
          claseDeGas,
          contenido
        );
        await updateCylinderStatus(cylinderPageId, estadoRecargaCilindro, cylinderPressure);

        // Evitar problemas con el max rate del API de Notion
        await sleep();

        console.log(separador);

        //#endregion
      } catch (error) {
        const { message, stack } = error;
        recibosErrorOutput.push({
          prestado_a: localizacion,
          tipo_prestamo: tipoPrestamo,
          fecha_entrada: fechaEntrada,
          fecha_salida: fechaSalida,
          fecha_retorno: fechaRetorno,
          cilindro: serial,
          estado,
          error: {
            message,
            stack
          }
        });
        console.error(`Error procesando cilindro ${serial}: ${message} | ${stack}`);
        console.log(separador);
      }
    }

    const endTime = Date.now();
    const durationInMinutes = getProcessDurationInMins(startTime, endTime);
    console.log(`Proceso de importacion tomo ${durationInMinutes} mins`);

    const outputFile = 'recibos_errored';

    if (recibosErrorOutput.length > 0) {
      console.error(`Se produjeron ${recibosErrorOutput.length} errores durante la ejecucion.`);
      writeJsonFile(outputFile, recibosErrorOutput);
    } else {
      removeJsonFile(outputFile);
    }
  };

  const deleteAllReceipts = async () => {
    const RATE_LIMIT_CODE = 429;

    //#region Funciones para aplicar operaciones con las entidades en Notion - Remover paginas

    const getCylinderInformation = async (cylinderPageId) => {
      const { mapCylinders } = require('../../utils/cylinders');
      const response = await fetch(`${NOTION_API_URL}/pages/${cylinderPageId}`, {
        keepalive: true,
        method: 'GET',
        headers
      });
      const data = await response.json();
      return mapCylinders(data);
    };

    const getInventoryItemsByCylinder = async (serial) => {
      const {
        mapInventoryItem,
        getInventoryByCylinder,
        inventoryFilteredProps
      } = require('../../utils/inventory');
      const INVENTORY_FILTERED_PROPS = mapFilteredProps(inventoryFilteredProps);
      const INVENTORY_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_INVENTORY}/query${INVENTORY_FILTERED_PROPS}`;
      const response = await fetch(INVENTORY_REQUEST_URL, {
        keepalive: true,
        method: 'POST',
        headers,
        body: getInventoryByCylinder(serial)
      });
      const data = await response.json();
      return data.results.map(mapInventoryItem);
    };

    const getPages = async (nextPage = null) => {
      const { receiptsFilteredProps } = require('../../utils/receipts');
      const RECEIPTS_FILTERED_PROPS = mapFilteredProps(receiptsFilteredProps);
      const RECEIPTS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_RECEIPTS}/query${RECEIPTS_FILTERED_PROPS}`;

      const requestBody = { page_size: 100 };
      if (nextPage) {
        requestBody.start_cursor = nextPage;
      }

      const response = await fetch(RECEIPTS_REQUEST_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (data.status === RATE_LIMIT_CODE) {
        console.error('Se supero el limite del API de Notion. Reintentando despues de 1 min...');
        await sleep(SLEEP_TIMEOUT.rate_limit);
        return getPages(nextPage);
      }
      return data;
    };

    const deletePage = async (pageId) => {
      console.log(`Removiendo pagina ${pageId}`);
      const response = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          archived: true
        })
      });

      if (response.status === RATE_LIMIT_CODE) {
        console.error(
          `Se supero el limite del API de Notion mientras se borraba la pagina ${pageId}. Reintentando despues de 1 min...`
        );
        await sleep(SLEEP_TIMEOUT.rate_limit);
        return deletePage(pageId);
      }
      return response.ok;
    };

    const deleteAllPages = async () => {
      const { mapReceipts } = require('../../utils/receipts');

      let hasMore = true,
        nextPage = null;

      while (hasMore) {
        const { results, next_cursor, has_more } = await getPages(nextPage);

        for (const page of results) {
          const { id: receiptPageId } = page;
          const { cilindros: cilindroReciboId } = mapReceipts(page);
          const success = await deletePage(receiptPageId);

          if (success) {
            const cylinderInfo = await getCylinderInformation(cilindroReciboId);
            console.log(`Se removio la pagina del recibo: ${receiptPageId}`);

            // Mark cylinder as pending for recharge
            await updateCylinderStatus(cilindroReciboId, cylindersRechargeStatus.not_charged);

            // Remove all product inventory pages related with the cylinder
            const inventoryItems = await getInventoryItemsByCylinder(cylinderInfo.serial);
            if (inventoryItems && inventoryItems.length > 0) {
              for (const inventory of inventoryItems) {
                await deletePage(inventory.id);
                console.log(`Se removio la pagina del inventario: ${inventory.id}`);
              }
            }
          } else {
            console.error(`No se pudo remover la pagina del recibo: ${receiptPageId}`);
          }
          console.log(separador);
          await sleep();
        }

        nextPage = next_cursor;
        hasMore = has_more;
      }

      console.log('Todas las paginas se han removido exitosamente!');
    };

    //#endregion

    const startTime = Date.now();
    await deleteAllPages();
    const endTime = Date.now();
    const durationInMinutes = getProcessDurationInMins(startTime, endTime);
    console.log(`Remover todas las paginas tomo ${durationInMinutes} mins`);
  };

  const args = process.argv.slice(2);
  const executeMode = args[0] || 'import';

  switch (executeMode) {
    case 'import':
      await importProcess();
      break;

    case 'remove':
      await deleteAllReceipts();
      break;

    default:
      console.warn('No se recibio el parametro que indica el modo de ejecucion');
      break;
  }
})();
