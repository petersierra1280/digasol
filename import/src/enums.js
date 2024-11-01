const CLIENTE_PARTICULAR = 'C00000';
const SLEEP_TIMEOUT = {
  default: 500,
  rate_limit: 60000
};

const receiptStatus = {
  disponible: 'DISPONIBLE',
  no_disponible: 'NO_DISPONIBLE'
};

const providersFromImport = {
  DIGASOL: 'Digasol',
  'DOMICILIOS CRISTOBAL': 'Domicilios Cristobal',
  AGA: 'AGA (Messer Colombia S.A.)',
  'GASES DE LA COSTA': 'Gases de la Costa',
  'GAS PLUS': 'Gas Plus',
  OXINORT: 'Oxinort'
};

module.exports = {
  CLIENTE_PARTICULAR,
  SLEEP_TIMEOUT,
  receiptStatus,
  providersFromImport
};
