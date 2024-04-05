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

function getISODate(date) {
    const timeZoneOffset = (new Date()).getTimezoneOffset() * 60000; // offset in milliseconds
    return (new Date(date.getTime() - timeZoneOffset)).toISOString().slice(0, -1);
}

module.exports = {
    notionApiHeaders,
    mapFilteredProps,
    getISODate
}