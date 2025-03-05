class PriceChart {

    constructor(parentElement, streamingData) {
        this.parentElement = parentElement;
        this.streamingData = streamingData;
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
        vis.height = 300 

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
        // console.log(vis.streamingDisplayData.get("Netflix"))

        // Add the ticket data to displayData

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

        vis.path = vis.svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            // .attr("stroke-linejoin", "round")
            // .attr("stroke-linecap", "round")
            .selectAll("path")
            .data(vis.displayData.values())
            .join("path")
            .style("mix-blend-mode", "multiply")
            .attr("d", vis.line);

        // Update axes
        vis.svg.select(".y-axis").call(vis.yAxis);
        vis.svg.select(".x-axis").call(vis.xAxis);

    }
}