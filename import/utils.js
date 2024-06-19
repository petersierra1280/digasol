const writeJsonFile = (file, jsonVariable) => {
    const fs = require('node:fs');
    fs.writeFileSync(`output/${file}.json`, JSON.stringify(jsonVariable));
};

module.exports = {
    writeJsonFile
};