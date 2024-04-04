//#region Import references
const { NOTION_API_URL, NOTION_DATABASE_CYLINDERS, NOTION_DATABASE_COMPARISON } = process.env;
const { notionApiHeaders: headers, mapFilteredProps } = require('../../utils/index');
const { getCylindersByProvider, mapCylinders, cylindersComparisonFilteredProps } = require('../../utils/cylinders');
const { getComparisonList, updateComparisonItem, getHTMLSummary, mapComparisonList, comparisonFilteredProps } = require('../../utils/comparison');
//#endregion

//#region Obtener cilindros del proveedor
const getCylinders = async (providerName) => {
    const CYLINDERS_FILTERED_PROPS = mapFilteredProps(cylindersComparisonFilteredProps);
    const CYLINDERS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_CYLINDERS}/query${CYLINDERS_FILTERED_PROPS}`;

    const cylinderItems = [];
    let nextPage = null, hasMore = true;
    while (hasMore) {
        const responseCylinders = await fetch(CYLINDERS_REQUEST_URL, {
            keepalive: true,
            method: 'POST',
            headers,
            body: getCylindersByProvider(providerName, nextPage)
        });
        const { results, next_cursor, has_more, status } = await responseCylinders.json();
        if (status === 429) {
            console.error('Notion API rate limit exceeded!');
            break;
        }
        if (results) {
            cylinderItems.push(...results.map(item => mapCylinders(item, 'COMPARISON')));
        }
        nextPage = next_cursor;
        hasMore = has_more;
    }
    return cylinderItems;
}
//#endregion

//#region Obtiene los registros de la BD de comparacion
const getComparisonItems = async () => {
    const COMPARISON_FILTERED_PROPS = mapFilteredProps(comparisonFilteredProps);
    const COMPARISON_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_COMPARISON}/query${COMPARISON_FILTERED_PROPS}`;

    const comparisonItems = [];
    let nextPage = null, hasMore = true;
    while (hasMore) {
        const responseComparison = await fetch(COMPARISON_REQUEST_URL, {
            keepalive: true,
            method: 'POST',
            headers,
            body: getComparisonList(nextPage)
        });
        const info = await responseComparison.json();
        const { results, next_cursor, has_more, status } = info
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
}
//#endregion

//#region Comparar cilindros del proveedor vs Digasol
const compareCylinders = async (comparisonItems, cylinders) => {
    let foundCylinders = 0, notFoundCylinders = 0, cylindersWithDifferences = 0, cylindersEqual = 0;

    if (comparisonItems && comparisonItems.length > 0) {
        await Promise.all(comparisonItems.map(async item => {
            let cylinderFound = false, providerDate, digasolDate;
            const { id: comparisonId, serial: serialCylinderProvider, fecha_entrega: deliveryDate } = item;
            const cylinderOwnedByDigasol = cylinders.find(cylinder => cylinder.serial === serialCylinderProvider);

            if (cylinderOwnedByDigasol) {
                foundCylinders++;
                cylinderFound = true;
                const { recepcion_proveedor: receptionDate } = cylinderOwnedByDigasol;
                providerDate = new Date(deliveryDate);
                digasolDate = new Date(receptionDate);
                const datesDiff = Math.floor((providerDate.getTime() - digasolDate.getTime()) / (1000 * 60 * 60 * 24));

                // Se soporta un margen de tolerancia de 1 dia de diferencia
                if ([1, 0, -1].includes(datesDiff)) {
                    cylindersEqual++;
                } else {
                    cylindersWithDifferences++;
                }
            } else {
                notFoundCylinders++;
                cylinderFound = false;
                providerDate = '';
                digasolDate = '';
            }

            const { status } = await fetch(`${NOTION_API_URL}/pages/${comparisonId}`, {
                keepalive: true,
                method: 'PATCH',
                headers,
                body: updateComparisonItem({
                    fecha_entrega: providerDate ? providerDate.toISOString() : '',
                    encontrado: cylinderFound,
                    fecha_recepcion: digasolDate ? digasolDate.toISOString() : ''
                })
            });
            if (status === 429) {
                console.error('Notion API rate limit exceeded!');
            }
        }));
    }
    return {
        foundCylinders,
        notFoundCylinders,
        cylindersWithDifferences,
        cylindersEqual
    }
}
//#endregion

exports.handler = async event => {
    try {
        const providerName = event.queryStringParameters.proveedor;

        const [comparisonItems, cylinders] = await Promise.all([
            await getComparisonItems(),
            await getCylinders(providerName)
        ]);

        const comparisonResults = await compareCylinders(comparisonItems, cylinders);

        return {
            statusCode: 200,
            headers: {
                'Content-type': 'text/html; charset=UTF-8',
            },
            body: getHTMLSummary({
                providerName,
                comparisonItems,
                cylinders,
                ...comparisonResults
            })
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: `Failed fetching Notion data`,
        }
    }
}