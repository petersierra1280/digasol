require('dotenv').config({ path: `../../.env` });

const proveedores = require('./files/proveedores.json');
const clientes = require('./files/clientes.json');
const cilindros = require('./files/cilindros_full.json');

const {
  writeJsonFile,
  sleep,
  validateStringDate,
  isCylinderInDigasol,
  SLEEP_TIMEOUT,
  receiptStatus
} = require('./utils');
const { mapFilteredProps, notionApiHeaders: headers } = require('../../utils/index');
const { tipoPrestamo: prestamos } = require('../../utils/receipts');

const {
  NOTION_API_URL,
  NOTION_DATABASE_CLIENTS,
  NOTION_DATABASE_PROVIDERS,
  NOTION_DATABASE_CYLINDERS,
  NOTION_DATABASE_RECEIPTS
} = process.env;

(async () => {
  const separador = '-----------';

  const importProcess = async () => {
    let recibosErrorOutput = [];

    //#region Funciones para aplicar operaciones con las diferentes entidades en Notion

    const getClientInformation = async (clientName) => {
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
      return clientsData.results.map(mapClients)[0];
    };

    const getProviderInformation = async (providerName) => {
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
      return providersData.results.map(mapProviders)[0];
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
        const errorBody = await result.text();
        console.error('Response body: ', errorBody);
      } else {
        console.log('Recibo creado exitosamente');
      }
    };

    const updateCylinderStatus = async (cylinderPageId, recharged = true) => {
      const {
        markCylinderAsRecharged,
        markCylinderAsNotRecharged
      } = require('../../utils/cylinders');
      const result = await fetch(`${NOTION_API_URL}/pages/${cylinderPageId}`, {
        keepalive: true,
        method: 'PATCH',
        headers,
        body: recharged ? markCylinderAsRecharged() : markCylinderAsNotRecharged()
      });
      if (!result.ok) {
        console.error(
          'Error actualizando el estado del cilindro. Response: ',
          result.status,
          result.statusText
        );
        const errorBody = await result.text();
        console.error('Response body: ', errorBody);
      } else {
        console.log('Estado del cilindro actualizado exitosamente');
      }
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
        codigo: serial,
        estado
      } = cilindro;
      let { localizacion } = cilindro;

      console.log(`${index}) Procesando cilindro: ${serial}`);

      const cliente = clientes.find((cliente) => cliente['nombre'].toUpperCase() === localizacion);
      const proveedor = proveedores.find(
        (proveedor) => proveedor['nombre'].toUpperCase() === localizacion
      );

      const tipoPrestamo = cliente ? prestamos.cliente : proveedor ? prestamos.proveedor : 'N/A';
      if (tipoPrestamo === prestamos.proveedor && localizacion === 'AGA') {
        localizacion = 'AGA (Messer Colombia S.A.)';
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
        }
        entityId = entityInfo?.id;

        // 2. Obtener informacion del cilindro asociado -> ID de de la pagina
        const cylinderInfo = await getCylinderInformation(serial);
        let cylinderPageId = cylinderInfo?.id;

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
        if (!confirmarPrestamo && cylinderInfo.proveedor) {
          // Sobreescribe el ID del proveedor para referenciar la recepcion de un cilindro de parte del proveedor
          entityInfo = cylinderInfo.proveedor;
        }
        receiptItem[tipoPrestamo === prestamos.cliente ? 'cliente_id' : 'proveedor_id'] = entityId;

        await createReceipt(receiptItem);

        // 4. Actualizar el cilindro asociado -> Estado recargado (siempre y cuando el prestamo este en progreso)
        await updateCylinderStatus(cylinderPageId, confirmarPrestamo);

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
      }
      index++;
    }

    const endTime = Date.now();
    const durationInMs = endTime - startTime;
    const durationInMinutes = (durationInMs / (1000 * 60)).toFixed(2);
    console.log(`Proceso de importacion tomo ${durationInMinutes} mins`);

    if (recibosErrorOutput.length > 0) {
      console.error(`Se produjeron ${recibosErrorOutput.length} errores durante la ejecucion.`);
      writeJsonFile('recibos_errored', recibosErrorOutput);
    }
  };

  const deleteAllReceipts = async () => {
    const RATE_LIMIT_CODE = 429;

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
        console.error('Rate limit exceeded. Retrying after delay...');
        await sleep(SLEEP_TIMEOUT.rate_limit);
        return getPages(nextPage);
      }
      return data;
    };

    const deletePage = async (pageId) => {
      console.log(`Deleting page ${pageId}`);
      const response = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          archived: true
        })
      });

      if (response.status === RATE_LIMIT_CODE) {
        console.error(`Rate limit exceeded while deleting page ${pageId}. Retrying after delay...`);
        await sleep(SLEEP_TIMEOUT.rate_limit);
        return deletePage(pageId);
      }
      return response.ok;
    };

    const deleteAllPages = async () => {
      let hasMore = true,
        nextPage = null;

      while (hasMore) {
        const { results, next_cursor, has_more } = await getPages(nextPage);

        for (const page of results) {
          const { id: receiptPageId } = page;
          const success = await deletePage(receiptPageId);
          if (success) {
            console.log(`Deleted page: ${receiptPageId}`);
          } else {
            console.error(`Failed to delete receipt page: ${receiptPageId}`);
          }
          console.log(separador);
          await sleep();
        }

        nextPage = next_cursor;
        hasMore = has_more;
      }

      console.log('All receipt pages deleted successfully!');
    };

    await deleteAllPages();
  };

  const args = process.argv.slice(2);
  const executeMode = args[0] || 'import';

  /*
   * TODO:
   * 1.  Finish testing import records
   * 2.  When removing receipts...
   * 2.1 Restore cylinder status to "pending for recharge" when removing receipts
   * 2.2 Delete product inventory records related with the receipt at the moment of being removed
   * 3.  Ability to resume if the process is interrupted (validate if a cylinder is already associated with a receipt)
   * 4.  Update cylinders pressure at the moment of updating the recharge status (look at the index.js logic)
   * 5.  Save a local cache of clients and providers coming from the Notion API
   */

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
