class AwardsChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = [];

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = { top: 20, right: 20, bottom: 120, left: 50 };
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom - 50;

        // SVG drawing area
        vis.svg = d3.select(`#${vis.parentElement}`).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Scales and axes
        vis.x = d3.scaleBand().range([0, vis.width]).padding(0.2);
        vis.y = d3.scaleLinear().range([vis.height, 0]);

        vis.xAxis = d3.axisBottom().scale(vis.x);
        vis.yAxis = d3.axisLeft().scale(vis.y);

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${vis.height})`);
        vis.svg.append("g")
            .attr("class", "y-axis axis");

        // Append axis labels
        vis.svg.append("text")
            .attr("class", "x-axis-label")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + vis.margin.bottom - 30)
            .attr("text-anchor", "middle")
            .text("Distributor");

        vis.svg.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -vis.height / 2)
            .attr("y", -vis.margin.left + 15)
            .attr("text-anchor", "middle")
            .text("Number of Nominations");

        // Append tooltip with uniform styling
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.7)")
            .style("color", "white")
            .style("padding", "5px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("text-align", "left")
            .style("pointer-events", "none");

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;
        // Group data by distributor and count nominations
        const nomineeByDistributor = d3.group(vis.data, d => d.distributor);
        vis.displayData = [];
        for (let [dist, nominees] of nomineeByDistributor.entries()) {
            if (nominees.length > 1) {
                vis.displayData.push({
                    distributor: dist,
                    numberOfNoms: nominees.length,
                    nominees: nominees
                });
            }
        }
        // Sort by number of nominations
        vis.displayData.sort((a, b) => d3.ascending(a.numberOfNoms, b.numberOfNoms));

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        // Update domains
        vis.x.domain(vis.displayData.map(d => d.distributor));
        vis.y.domain([0, d3.max(vis.displayData, d => d.numberOfNoms)]);

        // Draw rectangles for each distributor
        let bars = vis.svg.selectAll("rect.awards").data(vis.displayData);
        bars.enter().append("rect")
            .attr("class", "awards")
            .merge(bars)
            .attr("x", d => vis.x(d.distributor))
            .attr("y", d => vis.y(d.numberOfNoms))
            .attr("width", vis.x.bandwidth())
            .attr("height", d => vis.height - vis.y(d.numberOfNoms))
            .attr("fill", d => d.distributor === "Netflix" ? "#D4AF37" : "gray")
            .on("mouseover", function(event, d) {
                const currentFill = d3.select(this).attr("fill");
                d3.select(this).attr("fill", d3.color(currentFill).darker(0.5));
                const nomString = d.nominees.map(obj => `${obj.nominee} - ${obj.category}`).join("<br>");
                vis.tooltip.style("opacity", 1)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px")
                    .html(`<strong>${d.distributor} - ${d.numberOfNoms} nominees</strong><br>${nomString}`);
            })
            .on("mousemove", function(event) {
                vis.tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this).attr("fill", d.distributor === "Netflix" ? "#D4AF37" : "gray");
                vis.tooltip.style("opacity", 0);
            });
        bars.exit().remove();

        // Update axes
        vis.svg.select(".x-axis").call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.5em");
        vis.svg.select(".y-axis").call(vis.yAxis);

        // Add legend on the left side
        let legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(20,0)`);
        // Legend for Netflix
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", "#D4AF37");
        legend.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .text("Netflix")
            .attr("font-size", "12px")
            .attr("alignment-baseline", "middle");
        // Legend for other distributors
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 20)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", "gray");
        legend.append("text")
            .attr("x", 20)
            .attr("y", 30)
            .text("Other Distributors")
            .attr("font-size", "12px")
            .attr("alignment-baseline", "middle");
    }
}
