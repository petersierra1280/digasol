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
    const { properties, id } = item;
    return {
        id,
        cliente: {
            id: properties["Cliente"].relation[0].id,
            nombre: properties["Nombre cliente"].rollup.array[0].title[0].plain_text
        },
        fecha_prestamo: properties["Fecha prestamo"].date.start,
        numero_recibo: properties["Numero recibo"].unique_id.number
    }
};

// Se filtran las siguientes props: Cliente, Fecha prestamo y Numero recibo
const receiptsFilteredProps = ["~%60mE", "YgE%3F", "%7C%3AWJ", "YXYo"];

module.exports = {
    getBorrowedReceipts,
    mapReceipts,
    receiptsFilteredProps
}