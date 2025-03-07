class PriceChart {

    constructor(parentElement, streamingData, ticketData) {
        this.parentElement = parentElement;
        this.streamingData = streamingData;
        this.ticketData = ticketData;
        this.displayData = [];

        this.initVis();
    }

    /*
     * Initialize visualization (static content; e.g. SVG area, axes)
     */

    initVis() {
        let vis = this;

        vis.margin = { top: 10, right: 80, bottom: 20, left: 100 };

        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        // SVG drawing area
        vis.svg = d3.select(`#${vis.parentElement}`).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // Scales and axes
        vis.x = d3.scaleTime()
            .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.svg.append("g")
            .attr("class", "y-axis axis");

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate(0," + vis.height + ")");

        // Colours for the lines on the chart
        vis.colours = {
            "Netflix": "#E50914",
            "Disney+": "#0A5D9A",
            "HBO Max": "#542E83",
            "Hulu": "#1CE783",
            "Paramount+": "#003C71",
            "Prime Video": "#232F3E",
            "Apple TV+": "#333333",
            "Shudder": "#F34A4A",
            "Ticket": "#FFA500"
        };

        // (Filter, aggregate, modify data)
        vis.wrangleData();
    }


    /*
    * Data wrangling
    */

    wrangleData() {
        // Group streamingData by the streaming service
        let vis = this;

        // Create list of the streaming services
        vis.services = [...new Set(vis.streamingData.map(d => d.service))];

        // Group streamingData with all the types of streaming service
        vis.displayData = d3.group(vis.streamingData, d => d.service);

        // Make ticketData into a format which can be added to vis.displayData
        let ticketFormatted = [];
        let [minDate, maxDate] = d3.extent(vis.streamingData, d => d.date);

        for (let data of vis.ticketData) {
            // Only include data that's within the vis.x domain
            if (data.year >= minDate && data.year <= maxDate) {
                let tempObj = {
                    service: "Ticket",
                    date: data.year,
                    price: data.price
                };
    
                ticketFormatted.push(tempObj);
            }
        }

        // Add the ticket data to displayData
        vis.displayData.set('Ticket', ticketFormatted)
        vis.services.push("Ticket");

        // Update the visualization
        vis.updateVis();
    }


    /*
     * The drawing function
     */

    updateVis() {
        let vis = this;

        // Update domain
        vis.x.domain(d3.extent(vis.streamingData, d => d.date));
        vis.y.domain([0, d3.max(vis.streamingData, d => d.price)]);

        // D3 line path generator 
        vis.line = d3.line()
            .x(d => vis.x(d.date))
            .y(d => vis.y(d.price));

        // Draw the path
        vis.path = vis.svg.selectAll(".price-path")
            .data(vis.displayData.values());

        vis.path.enter().append("path")
            .attr("class", "price-path")
            .merge(vis.path)
            .attr("fill", "none")
            .attr("stroke", function (d) {
                let service = d[0].service
                return vis.colours[service]
            })
            .attr("stroke-width", 1.5)
            .attr("d", vis.line);

        // Add labels to each line
        vis.svg.selectAll("text.price-label")
            .data(vis.services)
            .enter()
            .append("text")
            .attr("class", "price-label")
            .text(d => d)
            .attr("x", d => {
                // Get the first object in displayData
                let firstObj = vis.displayData.get(d)[0]
                return vis.x(firstObj.date);
            })
            .attr("y", d => {
                // Get the first object in displayData
                let firstObj = vis.displayData.get(d)[0]
                // console.log(firstObj)
                return vis.y(firstObj.price);
            })
            .attr("dy", -5);
        
        // Update axes
        vis.svg.select(".y-axis").call(vis.yAxis);
        vis.svg.select(".x-axis").call(vis.xAxis);

    }
}