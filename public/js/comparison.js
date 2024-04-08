const PROVIDER_QUERY_PARAM = 'proveedor';
const MAX_ATTEMPTS = 3;

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
        } while (requestStatus != 200 && attempts < MAX_ATTEMPTS);

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
    cylindersWithDifferences,
    cylindersReturnedToProvider
}) {
    updateStatusHTML(
        `<h2>Resultados de la comparaci&oacute;n</h2>
        <table>
            <tr>
              <td><strong>Nombre proveedor:</strong></td>
              <td>${providerName}</td>
            </tr>
            <tr>
              <td><strong>Total items a comparar:</td>
              <td>${totalComparisonItems}</td>
            </tr>
            <tr>
              <td><strong>Total cilindros del proveedor:</td>
              <td>${totalCylinders}</td>
            </tr>
            <tr>
              <td><strong>Cilindros encontrados:</td>
              <td>${foundCylinders}</td>
            </tr>
            <tr>
              <td><strong>Cilindros no encontrados:</td>
              <td>${notFoundCylinders}</td>
            </tr>
            <tr>
              <td><strong>Cilindros iguales:</td>
              <td>${cylindersEqual}</td>
            </tr>
            <tr>
              <td><strong>Cilindros con diferencias:</td>
              <td>${cylindersWithDifferences}</td>
            </tr>
            <tr>
              <td><strong>Cilindros regresados a proveedor:</td>
              <td>${cylindersReturnedToProvider}</td>
            </tr>
        </table>

        <div>
            <p>
                Por favor, regresar al <strong>Cruce de Cuentas con Proveedores</strong> en Notion para consultar m&aacute;s detalles.
            </p>
        </div>`);
}

getComparisonSummary();