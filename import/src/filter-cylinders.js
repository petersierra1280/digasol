const cilindrosConfirmados = require('./files/cilindros_full.json');
// Este archivo hace referencia a la lista completa de cilindros a la fecha de hoy
const cilindrosListaCompleta = require('./files/cilindros_current.json');

const { writeJsonFile } = require('./utils');

const cilindrosOutput = [];

if (!cilindrosConfirmados) {
  console.error('No se pudo encontrar el archivo de cilindros confirmados');
  return;
}

if (!cilindrosListaCompleta) {
  console.error('No se pudo encontrar el archivo con la lista completa de cilindros');
  return;
}

cilindrosListaCompleta.forEach(async (cilindro) => {
  const existeCilindro = cilindrosConfirmados.find((cf) => cf.codigo === cilindro.codigo);
  if (existeCilindro) {
    cilindrosOutput.push(cilindro);
  }
});

// El contenido del output debe reemplazar al archivo de files/cilindros_full.json
writeJsonFile('cilindros_current_filtered', cilindrosOutput);
