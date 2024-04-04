const getComparisonList = (cursorId) => `{
    ${cursorId ? `"start_cursor": "${cursorId}"` : ''}
}`;

const updateComparisonItem = ({ fecha_entrega, encontrado, fecha_recepcion }) => `{
    "properties": {
        "Fecha entrega": {
            "date": ${ fecha_entrega ? `{ "start": "${fecha_entrega}" }`: `null` }
        },
        "Encontrado": {
            "checkbox": ${encontrado}
        },
        "Fecha recepcion": {
            "date": ${ fecha_recepcion ? `{ "start": "${fecha_recepcion}" }`: `null` }
        }
    }
}`;

const getHTMLSummary = ({ providerName, comparisonItems, cylinders, foundCylinders, notFoundCylinders, cylindersEqual, cylindersWithDifferences, error }) =>
`
    <body style="background-color: black; padding: 15px; color: white; ; text-align: left; font-family: system-ui;">
        ${
            error ?
            `<p>
                La comparaci&oacute;n tom&oacute; m&aacute;s tiempo del esperado. Por favor intente recargando la p&aacute;gina.
            </p>`
            : 
            `<h2>Resultados de la comparaci&oacute;n</h2>
            <ul>
                <li>
                    <strong>Nombre proveedor: </strong>
                    <span>${providerName}</span>
                </li>
                <li>
                    <strong>Total items a comparar: </strong>
                    <span>${comparisonItems.length}</span>
                </li>
                <li>
                    <strong>Total cilindros del proveedor: </strong>
                    <span>${cylinders.length}</span>
                </li>
                <li>
                    <strong>Cilindros encontrados: </strong>
                    <span>${foundCylinders}</span>
                </li>
                <li>
                    <strong>Cilindros no encontrados: </strong>
                    <span>${notFoundCylinders}</span>
                </li>
                <li>
                    <strong>Cilindros iguales: </strong>
                    <span>${cylindersEqual}</span>
                </li>
                <li>
                    <strong>Cilindros con diferencias: </strong>
                    <span>${cylindersWithDifferences}</span>
                </li>
            </ul>
            <div>
                <p>
                    Por favor, regresar al <strong>Cruce de Cuentas con Proveedores</strong> en Notion para consultar m&aacute;s detalles.
                </p>
            </div>
            `
        }
    </body>
`;

function mapComparisonList(item) {
    const { properties, id } = item;
    return {
        id,
        serial: properties["Serial cilindro"].title[0].plain_text,
        fecha_proveedor: properties["Fecha proveedor"].rich_text[0].plain_text,
        encontrado: properties["Encontrado"].checkbox,
        fecha_entrega: properties["Fecha entrega"].date?.start
        
    }
};

// Se filtran las siguientes props: Serial cilindro, Fecha proveedor, Encontrado y Fecha entrega
const comparisonFilteredProps = ["title", "z%5E%60M", "k~Al", "%5Dql_"];

module.exports = {
    getComparisonList,
    updateComparisonItem,
    getHTMLSummary,
    mapComparisonList,
    comparisonFilteredProps
}