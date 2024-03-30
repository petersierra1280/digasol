const { NOTION_API_KEY, NOTION_API_VERSION } = process.env;

const notionApiHeaders = {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_API_VERSION
};

function mapFilteredProps(props) {
    return props.map(function (prop, index) {
        const prefix = index === 0 ? '?' : '&';
        return `${prefix}filter_properties=${prop}`;
    }).join('');
}

module.exports = {
    notionApiHeaders,
    mapFilteredProps
}