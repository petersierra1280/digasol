function inventoryItems(items) {
    return items.map(function(item){
        return `{
            "property": "Numero recibo",
            "number": {
                "equals": ${item}
            }
        }`;
    });
}

const getInventoryList = (items) => `{
    "filter": {
        "and": [
            {
                "or": [
                    ${inventoryItems(items)}
                ]
            }
        ]
    }
}`;

function mapInventoryItem(item) {
    const { properties, id } = item;
    return {
        id,
        numero_recibo: properties["Numero recibo"].number
    }
};

// Se filtran las siguientes props: Numero recibo
const inventoryFilteredProps = ["D%7B%40f"];

module.exports = {
    getInventoryList,
    mapInventoryItem,
    inventoryFilteredProps
}