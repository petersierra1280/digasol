const { TZ = 'America/Bogota' } = process.env;

const getComparisonList = (cursorId) => `{
    ${cursorId ? `"start_cursor": "${cursorId}"` : ''}
}`;

const updateComparisonItem = ({
    fecha_entrega,
    encontrado,
    fecha_recepcion,
    detalles_devolucion
}) => `{
    "properties": {
        "Fecha entrega": {
            "date": ${fecha_entrega ? `{ "start": "${fecha_entrega}", "time_zone": "${TZ}" }` : `null`}
        },
        "Encontrado": {
            "checkbox": ${encontrado}
        },
        "Fecha recepcion": {
            "date": ${fecha_recepcion ? `{ "start": "${fecha_recepcion}", "time_zone": "${TZ}" }` : `null`}
        },
        "Detalles devolucion proveedor": {
            "rich_text": [
                {
                    "type": "text",
                    "text": {
                        "content": "${detalles_devolucion}"
                    }
                }
            ]
        }
    }
}`;

function mapComparisonList(item) {
    const { properties, id } = item;
    return {
        id,
        serial: properties["Serial cilindro"].title[0].plain_text,
        fecha_proveedor: properties["Fecha proveedor"].rich_text[0].plain_text,
        encontrado: properties["Encontrado"].checkbox,
        fecha_entrega: properties["Fecha entrega"].date?.start,
        fecha_recepcion: properties["Fecha recepcion"].date?.start,
        detalles_devolucion: properties["Detalles devolucion proveedor"].rich_text[0]?.plain_text
    }
};

// Se filtran las siguientes props: Serial cilindro, Fecha proveedor, Encontrado, Fecha entrega, Fecha recepcion y Detalles devolucion proveedor
const comparisonFilteredProps = ["title", "z%5E%60M", "k~Al", "%5Dql_", "%3DIcz", "%5CNb%5C"];

module.exports = {
    getComparisonList,
    updateComparisonItem,
    mapComparisonList,
    comparisonFilteredProps
}