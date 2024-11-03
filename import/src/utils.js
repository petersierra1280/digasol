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
  const { SLEEP_TIMEOUT } = require('./enums');
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

const DIGASOL = 'DIGASOL';

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
  getProcessDurationInMins
};
