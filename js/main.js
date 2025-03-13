// Initialize chart vartiables
let priceChart;
let awardsChart;

// Date parser to convert strings to date objects
let parseDateSub = d3.timeParse("%b-%Y"); // parser for streaming_service.csv
let parseDateTicket = d3.timeParse("%Y"); // parser for ticket_prices.csv

// Start application by loading the data using promises
let promises = [
    d3.csv("./data/streaming_service.csv", row => {
        row.date = parseDateSub(row.date);
        row.price = +row.price;

        return row;
    }),
    d3.csv("./data/ticket_prices.csv", row => {
        row.year = parseDateTicket(row.year);
        row.price = +row.price;

        return row;
    })
]

Promise.all(promises)
    .then(function(data) {
        let subscriptionData = data[0];
        let ticketData = data[1]

        priceChart = new PriceChart("price-chart", subscriptionData, ticketData);
    });

d3.csv("./data/oscars-2025.csv")
.then(function(data) {
    awardsChart = new AwardsChart("awards-chart", data);
})