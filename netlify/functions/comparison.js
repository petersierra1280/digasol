//#region Import references
const { NOTION_API_URL, NOTION_DATABASE_CYLINDERS, NOTION_DATABASE_COMPARISON } = process.env;
const { notionApiHeaders: headers, mapFilteredProps } = require('../../utils/index');
const { getCylindersByProvider, mapCylinders, cylindersComparisonFilteredProps } = require('../../utils/cylinders');
const { getComparisonList, mapComparisonList, comparisonFilteredProps } = require('../../utils/comparison');
//#endregion

//#region Obtener cilindros del proveedor
const getCylinders = async (providerName) => {
    const CYLINDERS_FILTERED_PROPS = mapFilteredProps(cylindersComparisonFilteredProps);
    const CYLINDERS_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_CYLINDERS}/query${CYLINDERS_FILTERED_PROPS}`

    const cylinderItems = [];
    let nextPage = null, hasMore = true;
    while (hasMore) {
        const responseCylinders = await fetch(CYLINDERS_REQUEST_URL, {
            method: 'POST',
            headers,
            body: getCylindersByProvider(providerName, nextPage)
        });
        const { results, next_cursor, has_more } = await responseCylinders.json();
        if (results) {
            cylinderItems.push(...results.map(item => mapCylinders(item, 'COMPARISON')));
        }
        nextPage = next_cursor;
        hasMore = has_more
    }
    return cylinderItems;
}
//#endregion

//#region Obtiene los registros de la BD de comparacion
const getComparisonItems = async () => {
    const COMPARISON_FILTERED_PROPS = mapFilteredProps(comparisonFilteredProps);
    const COMPARISON_REQUEST_URL = `${NOTION_API_URL}/databases/${NOTION_DATABASE_COMPARISON}/query${COMPARISON_FILTERED_PROPS}`

    const comparisonItems = [];
    let nextPage = null, hasMore = true;
    while (hasMore) {
        const responseComparison = await fetch(COMPARISON_REQUEST_URL, {
            method: 'POST',
            headers,
            body: getComparisonList(nextPage)
        });
        const { results, next_cursor, has_more } = await responseComparison.json();
        if (results) {
            comparisonItems.push(...results.map(mapComparisonList));
        }
        nextPage = next_cursor;
        hasMore = has_more
    }
    return comparisonItems;
}
//#endregion

exports.handler = async event => {
    try {
        const providerName = event.queryStringParameters.proveedor;

        const [comparisonItems, cylinders] = await Promise.all([
            await getComparisonItems(),
            await getCylinders(providerName)
        ]);

        const data = {
            providerName,
            comparisonItems,
            cylinders,
            totalComparisonItems: comparisonItems.length,
            totalCylinders: cylinders.length
        };

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: `Failed fetching Notion data`,
        }
    }
}