// Initialize chart vartiables
let priceChart;

// Date parser to convert strings to date objects
let parseDate = d3.timeParse("%b-%Y");

// Start application by loading the data
// Load streaming_service.csv
d3.csv("./data/streaming_service.csv", row => {
    row.date = parseDate(row.date);
    row.price = +row.price;

    return row;
}).then(data => {
    priceChart = new PriceChart("price-chart", data);
});