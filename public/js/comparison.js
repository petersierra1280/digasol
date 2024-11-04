const PROVIDER_QUERY_PARAM = 'proveedor';
const MAX_ATTEMPTS = 10;
const PAGE_SIZE = 100;

async function getComparisonSummary(
  nextPage = null,
  allComparisonData = {
    foundCylinders: 0,
    notFoundCylinders: 0,
    cylindersEqual: 0,
    cylindersWithDifferences: 0,
    cylindersReturnedToProvider: 0,
    totalComparisonItems: 0,
    totalCylinders: 0
  }
) {
  const urlParams = new URLSearchParams(window.location.search);
  const providerName = urlParams.get(PROVIDER_QUERY_PARAM);
  if (providerName) {
    showLoadingState();
    let attempts = 0,
      requestStatus;
    do {
      let apiUrl = `api/comparison?${PROVIDER_QUERY_PARAM}=${providerName}&pageSize=${PAGE_SIZE}`;
      if (nextPage) apiUrl += `&nextPage=${nextPage}`;
      const response = await fetch(apiUrl);
      const { status } = response;
      requestStatus = status;
      attempts++;

      if (status === 200) {
        const comparisonData = await response.json();
        
        // Accumulate data
        allComparisonData.providerName = comparisonData.providerName;
        allComparisonData.foundCylinders += comparisonData.foundCylinders;
        allComparisonData.foundCylinders += comparisonData.foundCylinders;
        allComparisonData.notFoundCylinders += comparisonData.notFoundCylinders;
        allComparisonData.cylindersEqual += comparisonData.cylindersEqual;
        allComparisonData.cylindersWithDifferences += comparisonData.cylindersWithDifferences;
        allComparisonData.cylindersReturnedToProvider += comparisonData.cylindersReturnedToProvider;
        allComparisonData.totalComparisonItems += comparisonData.totalComparisonItems;
        allComparisonData.totalCylinders += comparisonData.totalCylinders;
        allComparisonData.totalCylinders += comparisonData.totalCylinders;

        // If more cylinders are available, recursively fetch the next page
        if (comparisonData.hasMore) {
          return getComparisonSummary(comparisonData.nextPage, allComparisonData);
        } else {
          // Final data to display when all pages are processed
          writeSummary(allComparisonData);
        }
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
        `);
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
        </div>`
  );
}

getComparisonSummary();
