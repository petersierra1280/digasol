const getClientsByName = (clientName) => {
    return `{
        "filter": {
            "and": [
                {
                    "property": "Nombres y Apellidos",
                    "rich_text": {
                        "equals": "${clientName}"
                    }
                }
            ]
        }
    }`;
}

function mapClients(item) {
    const { properties, id } = item;
    return {
        id,
        nombres: properties["Nombres y Apellidos"].title[0].plain_text
    };
};

const clientsFilteredProps = ["title"];

module.exports = {
    getClientsByName,
    mapClients,
    clientsFilteredProps
}