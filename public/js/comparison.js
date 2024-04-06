const PROVIDER_QUERY_PARAM = 'proveedor';

async function getComparisonSummary() {
    const urlParams = new URLSearchParams(window.location.search);
    const providerName = urlParams.get(PROVIDER_QUERY_PARAM);
    if (providerName) {
        showLoadingState();
        let attempts = 0, requestStatus;
        do {
            const response = await fetch(`api/comparison?${PROVIDER_QUERY_PARAM}=${providerName}`);
            const { status } = response;
            requestStatus = status;
            attempts++;
            
            if (status === 200) {
                const comparisonData = await response.json();
                writeSummary({ ...comparisonData });
            }
        } while (requestStatus != 200 && attempts < 3);

        if (requestStatus === 500) {
            showErrorMessage();
        }
    }
}

function updateStatusHTML(HTMLcode) {
    document.getElementById('comparison-output').innerHTML = HTMLcode;
}

function showLoadingState() {
    updateStatusHTML(`
        <img src="/imgs/loading.gif" width="30">
        <span>Procesando comparaci&oacute;n de cilindros</span>
        `
    );
}

function showErrorMessage() {
    updateStatusHTML(`
        <p>
            La comparaci&oacute;n tom&oacute; m&aacute;s tiempo del esperado. Por favor intente recargando la p&aacute;gina.
        </p>
    `);
}

function writeSummary({
    providerName,
    totalComparisonItems,
    totalCylinders,
    foundCylinders,
    notFoundCylinders,
    cylindersEqual,
    cylindersWithDifferences
}) {
    updateStatusHTML(
        `<h2>Resultados de la comparaci&oacute;n</h2>
        <ul>
            <li>
                <strong>Nombre proveedor: </strong>
                <span>${providerName}</span>
            </li>
            <li>
                <strong>Total items a comparar: </strong>
                <span>${totalComparisonItems}</span>
            </li>
            <li>
                <strong>Total cilindros del proveedor: </strong>
                <span>${totalCylinders}</span>
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
        </div>`);
}

getComparisonSummary();