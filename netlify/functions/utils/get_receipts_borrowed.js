const getBorrowedReceipts = `{
    "filter": {
        "and": [
            {
                "property": "Prestado a cliente",
                "checkbox": {
                    "equals": true
                }
            },
            {
                "property": "Cliente",
                "relation": {
                    "is_not_empty": true
                }
            },
            {
                "property": "Proveedor",
                "relation": {
                    "is_empty": true
                }
            },
            {
                "property": "Cilindros",
                "relation": {
                    "is_not_empty": true
                }
            }
        ]
    }
}`;

function mapReceipts(item) {
    const { properties } = item;
    return {
        cliente: properties["Cliente"].relation[0].id,
        fecha_prestamo: properties["Fecha prestamo"].date.start,
        cilindros: properties["Cilindros"].relation.map(function(cilindro) {
            return {
                id: cilindro.id
            }
        }),
        numero_recibo: properties["Numero recibo"].unique_id.number
    }
};

module.exports = {
    getBorrowedReceipts,
    mapReceipts
}