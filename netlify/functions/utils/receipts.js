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
        cliente: properties["Cliente"].relation[0].id,
        fecha_prestamo: properties["Fecha prestamo"].date.start,
        cilindros: properties["Cilindros"].relation.map(function(cilindro) {
            return {
                id: cilindro.id
            }
        }),
        numero_recibo: properties["Numero recibo"].unique_id.number,
        total_pagar: properties["Total a pagar"].formula.number
    }
};

// Se filtran las siguientes props: Cliente, Fecha prestamo, Cilindros, Numero recibo y total a pagar
const receiptsFilteredProps = ["~%60mE", "%7C%3AWJ", "%7C%60Gg", "YXYo", "r%5B~s"];

module.exports = {
    getBorrowedReceipts,
    mapReceipts,
    receiptsFilteredProps
}