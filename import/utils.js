const writeJsonFile = (file, jsonVariable) => {
    const fs = require('node:fs');
    fs.writeFileSync(`output/${file}.json`, JSON.stringify(jsonVariable));
};

const CLIENTE_PARTICULAR = 'C00000';

module.exports = {
    writeJsonFile,
    CLIENTE_PARTICULAR
};