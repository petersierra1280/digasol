//#region Import references
const { NOTION_API_URL, NOTION_DATABASE_CYLINDERS, NOTION_DATABASE_COMPARISON } = process.env;
const {
  notionApiHeaders: headers,
  mapFilteredProps,
  getISODate,
  daysBetween
} = require('../../utils/index');
const {
  getCylindersByProvider,
  mapCylinders,
  cylindersCameFrom,
  cylinderProps
} = require('../../utils/cylinders');
const {
  getComparisonList,
  updateComparisonItem,
  mapComparisonList,
  comparisonFilteredProps
} = require('../../utils/comparison');
//#endregion

//#region Obtener cilindros del proveedor
const getCylinders = async (providerName, pageSize = 100, nextPage = null) => {
  const CYLINDERS_FILTERED_PROPS = mapFilteredProps(cylinderProps(cylindersCameFrom.comparison));
  const CYLINDERS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_CYLINDERS}/query${CYLINDERS_FILTERED_PROPS}`;

  const responseCylinders = await fetch(CYLINDERS_REQUEST_URL, {
    keepalive: true,
    method: 'POST',
    headers,
    body: getCylindersByProvider(providerName, nextPage, pageSize)
  });
  const result = await responseCylinders.json();
  const { results, next_cursor, has_more, status } = result;
  if (status === 429) {
    console.error('Notion API rate limit exceeded!');
    return { cylinderItems: [], hasMore: false, nextPage: null };
  }
  const cylinderItems = new Map(
    results.map((item) => {
      const mappedCylinder = mapCylinders(item, cylindersCameFrom.comparison);
      return [mappedCylinder.serial, mappedCylinder];
    })
  );

  return {
    cylinderItems,
    hasMore: has_more,
    nextPage: next_cursor
  };
};
//#endregion

//#region Obtiene los registros de la BD de comparacion
const getComparisonItems = async () => {
  const COMPARISON_FILTERED_PROPS = mapFilteredProps(comparisonFilteredProps);
  const COMPARISON_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_COMPARISON}/query${COMPARISON_FILTERED_PROPS}`;

  const comparisonItems = [];
  let nextPage = null,
    hasMore = true;
  while (hasMore) {
    const responseComparison = await fetch(COMPARISON_REQUEST_URL, {
      keepalive: true,
      method: 'POST',
      headers,
      body: getComparisonList(nextPage)
    });
    const info = await responseComparison.json();
    const { results, next_cursor, has_more, status } = info;
    if (status === 429) {
      console.error('Notion API rate limit exceeded!');
      break;
    }
    if (results) {
      comparisonItems.push(...results.map(mapComparisonList));
    }
    nextPage = next_cursor;
    hasMore = has_more;
  }
  return comparisonItems;
};
//#endregion

//#region Comparar cilindros del proveedor vs Digasol
const compareCylinders = async (comparisonItems, cylinders) => {
  let foundCylinders = 0,
    notFoundCylinders = 0,
    cylindersWithDifferences = 0,
    cylindersEqual = 0,
    cylindersReturnedToProvider = 0;

  if (comparisonItems && comparisonItems.length > 0) {
    await Promise.all(
      comparisonItems.map(async (item) => {
        let cylinderFound = false,
          providerDate,
          digasolDate,
          providerReturnDetails = '';
        const {
          id: comparisonId,
          serial: serialCylinderProvider,
          fecha_proveedor: deliveryDate = '',
          encontrado: recordFound,
          fecha_entrega: deliveryDateMapped = '',
          fecha_recepcion: receptionDateMapped = '',
          detalles_devolucion: comparisonReturnDetails = ''
        } = item;
        const cylinderOwnedByDigasol = cylinders.get(serialCylinderProvider);

        if (cylinderOwnedByDigasol) {
          foundCylinders++;
          cylinderFound = true;
          const {
            recepcion_proveedor: receptionDate = '',
            detalles_devolucion: returnDetails = ''
          } = cylinderOwnedByDigasol;
          providerDate = deliveryDate ? new Date(deliveryDate) : '';
          digasolDate = receptionDate ? new Date(receptionDate) : '';
          providerReturnDetails = returnDetails;

          if (digasolDate) {
            const datesDiff = !providerDate ? -99 : daysBetween(providerDate, digasolDate);
            // Se soporta un margen de tolerancia de 1 dia de diferencia
            if ([1, 0, -1].includes(datesDiff)) {
              cylindersEqual++;
            } else {
              cylindersWithDifferences++;
            }
          } else {
            cylindersReturnedToProvider++;
          }
        } else {
          notFoundCylinders++;
          cylinderFound = false;
          providerDate = '';
          digasolDate = '';
          providerReturnDetails = '';
        }

        if (
          cylinderFound != recordFound ||
          (providerDate &&
            deliveryDateMapped &&
            providerDate.toISOString() != new Date(deliveryDateMapped).toISOString()) ||
          (deliveryDate === '' && deliveryDateMapped !== '') ||
          (deliveryDateMapped === '' && providerDate !== '') ||
          (!digasolDate &&
            (receptionDateMapped !== '' || providerReturnDetails !== comparisonReturnDetails))
        ) {
          const { status } = await fetch(`${NOTION_API_URL}/pages/${comparisonId}`, {
            keepalive: true,
            method: 'PATCH',
            headers,
            body: updateComparisonItem({
              fecha_entrega: providerDate ? getISODate(providerDate) : '',
              encontrado: cylinderFound,
              fecha_recepcion: digasolDate ? getISODate(digasolDate) : '',
              detalles_devolucion: providerReturnDetails.replace('\n', '\\n')
            })
          });
          if (status === 429) {
            console.error(`Notion API rate limit exceeded! | Item ID ${comparisonId} not updated`);
          }
        }
      })
    );
  }
  return {
    foundCylinders,
    notFoundCylinders,
    cylindersWithDifferences,
    cylindersEqual,
    cylindersReturnedToProvider
  };
};
//#endregion

exports.handler = async (event) => {
  try {
    const providerName = event.queryStringParameters.proveedor;
    const pageSize = parseInt(event.queryStringParameters.pageSize || '100');
    const nextPage = event.queryStringParameters.nextPage || null;

    const [comparisonItems, { cylinderItems, hasMore, nextPage: newNextPage }] = await Promise.all([
      await getComparisonItems(),
      await getCylinders(providerName, pageSize, nextPage)
    ]);
    const comparisonItemsFiltered = comparisonItems.filter((item) =>
      cylinderItems.has(item.serial)
    );
    const comparisonResults = await compareCylinders(comparisonItemsFiltered, cylinderItems);

    return {
      statusCode: 200,
      body: JSON.stringify({
        providerName,
        totalComparisonItems: comparisonItemsFiltered.length,
        totalCylinders: cylinderItems.size,
        hasMore,
        nextPage: newNextPage,
        ...comparisonResults
      })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: `Failed fetching Notion data`
    };
  }
};
