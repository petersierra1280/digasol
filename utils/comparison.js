const getComparisonList = (cursorId) => `{
    ${cursorId ? `"start_cursor": "${cursorId}"` : ''}
}`;

function mapComparisonList(item) {
    const { properties, id } = item;
    return {
        id,
        serial: properties["Serial cilindro"].title[0].plain_text,
        fecha_entrega: properties["Fecha entrega"].rich_text[0].plain_text
    }
};

// Se filtran las siguientes props: Serial cilindro y Fecha entrega
const comparisonFilteredProps = ["title", "z%5E%60M"];

module.exports = {
    getComparisonList,
    mapComparisonList,
    comparisonFilteredProps
}