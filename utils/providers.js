const getProvidersByName = (providerName) => {
  return `{
        "filter": {
            "and": [
                {
                    "property": "Nombre",
                    "rich_text": {
                        "equals": "${providerName}"
                    }
                }
            ]
        }
    }`;
};

function mapProviders(item) {
  const { properties, id } = item;
  return {
    id,
    nombres: properties['Nombres'].title[0].plain_text
  };
}

const providersFilteredProps = ['title'];

module.exports = {
  getProvidersByName,
  mapProviders,
  providersFilteredProps
};
