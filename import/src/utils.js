const writeJsonFile = (file, jsonVariable) => {
  const fs = require('node:fs');
  fs.writeFileSync(`output/${file}.json`, JSON.stringify(jsonVariable));
};

const removeJsonFile = (file) => {
  const { existsSync, unlinkSync } = require('node:fs');
  const filePath = `output/${file}.json`;
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms || SLEEP_TIMEOUT.default));
}

const getCurrentDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const validateStringDate = (date, defaultValue = true) => {
  return !date || (typeof date === 'string' && date.toLowerCase() === 'null')
    ? defaultValue
      ? getCurrentDate()
      : ''
    : date;
};

const CLIENTE_PARTICULAR = 'C00000';
const DIGASOL = 'DIGASOL';
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

const isCylinderInDigasol = (localization) => {
  if (!localization || typeof localization !== 'string') {
    return false;
  }
  return localization.toLowerCase().includes(DIGASOL);
};

const getProcessDurationInMins = (startTime, endTime) => {
  const durationInMs = endTime - startTime;
  return (durationInMs / (1000 * 60)).toFixed(2);
};

module.exports = {
  writeJsonFile,
  removeJsonFile,
  sleep,
  getCurrentDate,
  validateStringDate,
  isCylinderInDigasol,
  CLIENTE_PARTICULAR,
  SLEEP_TIMEOUT,
  receiptStatus,
  providersFromImport,
  getProcessDurationInMins
};
