class PriceChart {
    constructor(parentElement, streamingData, ticketData) {
        this.parentElement = parentElement;
        this.streamingData = streamingData;
        this.ticketData = ticketData;
        this.fullStreamingData = streamingData;
        this.fullTicketData = ticketData;
        this.displayData = [];
        this.services = [];
        this.allServices = [...new Set(this.fullStreamingData.map(d => d.service))];
        if (!this.allServices.includes("Ticket")) this.allServices.push("Ticket");
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = { top: 10, right: 130, bottom: 50, left: 50 };

        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        vis.svg = d3.select(`#${vis.parentElement}`).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        vis.x = d3.scaleTime().range([0, vis.width]);
        vis.y = d3.scaleLinear().range([vis.height, 0]);

        vis.xAxis = d3.axisBottom().scale(vis.x);
        vis.yAxis = d3.axisLeft().scale(vis.y);

        vis.svg.append("g")
            .attr("class", "y-axis axis");
        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", `translate(0,${vis.height})`);

        vis.svg.append("text")
            .attr("class", "x-axis-label")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + vis.margin.bottom - 10)
            .attr("text-anchor", "middle")
            .text("Year");

        vis.svg.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -vis.height / 2)
            .attr("y", -vis.margin.left + 20)
            .attr("text-anchor", "middle")
            .text("Price");

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

        vis.tooltip = vis.svg.append("g")
            .attr("display", "none")
            .attr("class", "tooltip");
        vis.tooltip.append("line")
            .attr("class", "tooltip-line")
            .attr("x1", 5)
            .attr("x2", 5)
            .attr("y1", 0)
            .attr("y2", vis.height)
            .style("stroke", "white");

        vis.tooltipDiv = d3.select("body").append("div")
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

        vis.legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width + 20}, 0)`);
        vis.allServices.forEach((s, i) => {
            vis.legend.append("rect")
                .attr("x", 0)
                .attr("y", i * 20)
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", vis.colours[s]);
            vis.legend.append("text")
                .attr("x", 20)
                .attr("y", i * 20 + 10)
                .text(s)
                .attr("font-size", "12px")
                .attr("alignment-baseline", "middle");
        });

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;
        vis.services = [...new Set(vis.streamingData.map(d => d.service))];
        vis.displayData = d3.group(vis.streamingData, d => d.service);
        let ticketFormatted = [];
        let [minDate, maxDate] = d3.extent(vis.streamingData, d => d.date);
        for (let data of vis.ticketData) {
            if (data.year >= minDate && data.year <= maxDate) {
                ticketFormatted.push({
                    service: "Ticket",
                    date: data.year,
                    price: data.price
                });
            }
        }
        vis.displayData.set("Ticket", ticketFormatted);
        vis.services.push("Ticket");
        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        vis.x.domain(d3.extent(vis.streamingData, d => d.date));
        vis.y.domain([0, d3.max(vis.streamingData, d => d.price)]);
        const yearCount = d3.timeYear.count(vis.x.domain()[0], vis.x.domain()[1]);
        if (yearCount < 2) {
            vis.xAxis.tickFormat(d3.timeFormat("%b"));
        } else {
            vis.xAxis.tickFormat(d3.timeFormat("%Y"));
        }
        vis.line = d3.line()
            .x(d => vis.x(d.date))
            .y(d => vis.y(d.price));
        let paths = vis.svg.selectAll(".price-path")
            .data(vis.displayData.values());
        paths.enter().append("path")
            .attr("class", "price-path")
            .merge(paths)
            .attr("fill", "none")
            .attr("stroke", d => vis.colours[d[0].service])
            .attr("stroke-width", 1.5)
            .attr("d", vis.line);
        paths.exit().remove();
        vis.svg.select(".y-axis").call(vis.yAxis);
        vis.svg.select(".x-axis").call(vis.xAxis);
        const formatDate = d3.timeFormat("%Y-%b");
        vis.svg.append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height)
            .attr("opacity", 0)
            .on("mouseover", function () {
                vis.tooltip.attr("display", null);
                vis.tooltipDiv.style("opacity", 1);
            })
            .on("mouseout", function () {
                vis.tooltip.attr("display", "none");
                vis.tooltipDiv.style("opacity", 0);
            })
            .on("mousemove", function (event) {
                let bisectDate = d3.bisector(d => d.date).left;
                let xPos = d3.pointer(event)[0];
                let xDate = vis.x.invert(xPos);
                let tooltipStrings = [];
                for (let key of vis.displayData.keys()) {
                    let arr = vis.displayData.get(key);
                    arr.sort((a, b) => a.date - b.date);
                    let index = bisectDate(arr, xDate);
                    let pointData = arr[index];
                    tooltipStrings.push(`${key} (${formatDate(pointData.date)}): ${pointData.price}`);
                }
                vis.tooltip.attr("transform", `translate(${xPos}, 0)`);
                vis.tooltipDiv.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px")
                    .html(tooltipStrings.join("<br>"));
            });
    }

    filterDataByYearRange(startYear, endYear) {
        let vis = this;
        vis.streamingData = vis.fullStreamingData.filter(d => {
            let year = d.date.getFullYear();
            return year >= startYear && year <= endYear;
        });
        vis.ticketData = vis.fullTicketData.filter(d => {
            let year = d.year.getFullYear();
            return year >= startYear && year <= endYear;
        });
        vis.wrangleData();
    }
}
