const CLIENTE_PARTICULAR = 'C00000';
const CAMBIO_CILINDRO = 'CAMBIO DE CILINDRO';
const SLEEP_TIMEOUT = {
  default: 500,
  rate_limit: 60000
};
const MAX_RETRY_ATTEMPTS = 3;
const HTTP_CONFLICT_ERROR = 409;

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
  CAMBIO_CILINDRO,
  SLEEP_TIMEOUT,
  MAX_RETRY_ATTEMPTS,
  HTTP_CONFLICT_ERROR,
  receiptStatus,
  providersFromImport
};
