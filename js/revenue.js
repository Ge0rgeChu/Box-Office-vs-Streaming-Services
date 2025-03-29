document.addEventListener("DOMContentLoaded", function () {
    const margin = { top: 50, right: 50, bottom: 70, left: 70 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#box-office-streaming-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // We'll dynamically set our domain from the data instead of [-0.5, 0.5].
    let currentRange = [0, 0];  // We'll redefine it after reading data

    // References to the vertical slider and labels
    const sliderElement = document.getElementById("slider");
    const sliderLowerLabel = d3.select("#slider-lower-label");
    const sliderUpperLabel = d3.select("#slider-upper-label");

    // Prepare tooltip (uniform style)
    const tooltip = d3.select("body")
        .append("div")
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

    Promise.all([
        d3.csv("data/BoxOfficeRevenueByQuarter2001-2024.csv"),
        d3.csv("data/NetflixSubscribers2012-2024ByQuarter.csv")
    ]).then(([boxOfficeData, netflixData]) => {

        // Convert quarterly data to yearly growth for box office
        let boxByYear = Array.from(
            d3.group(boxOfficeData, d => +d.Year),
            ([year, values]) => {
                return {
                    year: year,
                    revenue: d3.max(values, d => +d["Cumulative Gross"].replace(/[$, ]/g, ""))
                };
            }
        );
        boxByYear.sort((a, b) => a.year - b.year);
        boxByYear.forEach((d, i) => {
            if (i === 0) {
                d.growth = null;
                return;
            }
            const prev = boxByYear[i - 1];
            d.growth = (d.revenue - prev.revenue) / prev.revenue;
        });
        boxByYear = boxByYear.filter(d => d.growth !== null);

        // Convert Netflix data to yearly growth
        let netflixByYear = Array.from(
            d3.group(netflixData, d => +d.year),
            ([year, values]) => {
                return {
                    year: year,
                    subscribers: d3.max(values, d => +d["Netflix subscribers (mm)"])
                };
            }
        );
        netflixByYear.sort((a, b) => a.year - b.year);
        netflixByYear.forEach((d, i) => {
            if (i === 0) {
                d.growth = null;
                return;
            }
            const prev = netflixByYear[i - 1];
            d.growth = (d.subscribers - prev.subscribers) / prev.subscribers;
        });
        netflixByYear = netflixByYear.filter(d => d.growth !== null);

        // Merge box and Netflix growth data by year
        const mergedData = boxByYear.map(d => {
            const n = netflixByYear.find(n => n.year === d.year);
            return {
                year: d.year,
                boxGrowth: d.growth,
                revenue: d.revenue,
                netflixGrowth: n ? n.growth : null,
                subscribers: n ? n.subscribers : null
            };
        }).filter(d => d.netflixGrowth !== null);

        // Find min & max growth across both series
        const globalMin = d3.min(mergedData, d => Math.min(d.boxGrowth, d.netflixGrowth));
        const globalMax = d3.max(mergedData, d => Math.max(d.boxGrowth, d.netflixGrowth));

        // Use that for our default domain
        currentRange = [globalMin, globalMax];

        // Create scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(mergedData, d => new Date(d.year, 0, 1)))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(currentRange)  // from actual min to max
            .range([height, 0]);

        const xAxis = d3.axisBottom(xScale)
            .ticks(d3.timeYear.every(1))
            .tickFormat(d3.timeFormat("%Y"));

        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format(".0%"));

        // Append axes
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        // Axis labels
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + margin.bottom - 10)
            .text("Year");

        svg.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -margin.top)
            .text("Growth Rate (%)");

        // Reference line at 0
        svg.append("line")
            .attr("class", "ref-line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(0))
            .attr("y2", yScale(0))
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,4");

        // Lines
        svg.append("path")
            .datum(mergedData)
            .attr("id", "lineBox")
            .attr("fill", "none")
            .attr("stroke", "#ADD8E6")
            .attr("stroke-width", 2)
            .attr("d", d3.line()
                .x(d => xScale(new Date(d.year, 0, 1)))
                .y(d => yScale(d.boxGrowth))
            );

        svg.append("path")
            .datum(mergedData)
            .attr("id", "lineNetflix")
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", d3.line()
                .x(d => xScale(new Date(d.year, 0, 1)))
                .y(d => yScale(d.netflixGrowth))
            );

        // Points
        svg.selectAll("circle.box")
            .data(mergedData)
            .enter()
            .append("circle")
            .attr("class", "box")
            .attr("cx", d => xScale(new Date(d.year, 0, 1)))
            .attr("cy", d => yScale(d.boxGrowth))
            .attr("r", 4)
            .attr("fill", "#ADD8E6")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "#6495ED");
                tooltip.style("opacity", 1)
                    .html(
                        "Year: " + d.year +
                        "<br>Box Growth: " + d3.format(".1%")(d.boxGrowth) +
                        "<br>Revenue($): " + d3.format("$,")(d.revenue)
                    );
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill", "#ADD8E6");
                tooltip.style("opacity", 0);
            });

        svg.selectAll("circle.netflix")
            .data(mergedData)
            .enter()
            .append("circle")
            .attr("class", "netflix")
            .attr("cx", d => xScale(new Date(d.year, 0, 1)))
            .attr("cy", d => yScale(d.netflixGrowth))
            .attr("r", 4)
            .attr("fill", "red")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "darkred");
                tooltip.style("opacity", 1)
                    .html(
                        "Year: " + d.year +
                        "<br>Netflix Growth: " + d3.format(".1%")(d.netflixGrowth) +
                        "<br>Subscribers(mil): " + d.subscribers
                    );
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill", "red");
                tooltip.style("opacity", 0);
            });

        // Legend
        let legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 100}, 10)`);

        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", "#ADD8E6");
        legend.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .text("Box Office Growth")
            .style("font-size", "12px")
            .attr("alignment-baseline", "middle");

        legend.append("rect")
            .attr("x", 0)
            .attr("y", 20)
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", "red");
        legend.append("text")
            .attr("x", 20)
            .attr("y", 30)
            .text("Netflix Growth")
            .style("font-size", "12px")
            .attr("alignment-baseline", "middle");

        // Vertical noUiSlider, from globalMin..globalMax
        noUiSlider.create(sliderElement, {
            start: [globalMin * 100, globalMax * 100],
            connect: true,
            orientation: 'vertical',
            direction: 'rtl',
            step: 1,
            range: {
                min: globalMin * 100,
                max: globalMax * 100
            }
        });

        // Initialize the label text
        sliderUpperLabel.text(d3.format(".1%")(globalMin));
        sliderLowerLabel.text(d3.format(".1%")(globalMax));

        sliderElement.noUiSlider.on('slide', function(values) {
            // Convert from slider units (x100) back to real growth
            currentRange = [values[0] / 100, values[1] / 100];

            sliderUpperLabel.text(d3.format(".1%")(currentRange[0]));
            sliderLowerLabel.text(d3.format(".1%")(currentRange[1]));

            yScale.domain(currentRange);
            svg.select(".y.axis").call(yAxis.scale(yScale));

            // Update lines
            svg.select("#lineBox")
                .attr("d", d3.line()
                    .x(d => xScale(new Date(d.year, 0, 1)))
                    .y(d => yScale(d.boxGrowth))
                    (mergedData)
                );
            svg.select("#lineNetflix")
                .attr("d", d3.line()
                    .x(d => xScale(new Date(d.year, 0, 1)))
                    .y(d => yScale(d.netflixGrowth))
                    (mergedData)
                );

            // Update points
            svg.selectAll("circle.box")
                .attr("cy", d => yScale(d.boxGrowth))
                .style("display", d => (
                    d.boxGrowth < currentRange[0] || d.boxGrowth > currentRange[1] ||
                    d.year < window.startYear || d.year > window.endYear
                ) ? "none" : "block");

            svg.selectAll("circle.netflix")
                .attr("cy", d => yScale(d.netflixGrowth))
                .style("display", d => (
                    d.netflixGrowth < currentRange[0] || d.netflixGrowth > currentRange[1] ||
                    d.year < window.startYear || d.year > window.endYear
                ) ? "none" : "block");

            // Reference line for 0
            svg.select(".ref-line")
                .attr("y1", yScale(0))
                .attr("y2", yScale(0));
        });

        // Expose function to update chart by year range (for global slider)
        window.updateRevenueYears = function(startYear, endYear) {
            const filteredData = mergedData.filter(d => d.year >= startYear && d.year <= endYear);

            xScale.domain([new Date(startYear, 0, 1), new Date(endYear, 0, 1)]);
            svg.select(".x.axis").call(xAxis.scale(xScale));

            svg.select("#lineBox")
                .datum(filteredData)
                .attr("d", d3.line()
                    .x(d => xScale(new Date(d.year, 0, 1)))
                    .y(d => yScale(d.boxGrowth))
                );

            svg.select("#lineNetflix")
                .datum(filteredData)
                .attr("d", d3.line()
                    .x(d => xScale(new Date(d.year, 0, 1)))
                    .y(d => yScale(d.netflixGrowth))
                );

            // Show/hide circles depending on domain + year range
            svg.selectAll("circle.box")
                .attr("cx", d => xScale(new Date(d.year, 0, 1)))
                .style("display", d => (
                    d.year < startYear || d.year > endYear ||
                    d.boxGrowth < currentRange[0] || d.boxGrowth > currentRange[1]
                ) ? "none" : "block");

            svg.selectAll("circle.netflix")
                .attr("cx", d => xScale(new Date(d.year, 0, 1)))
                .style("display", d => (
                    d.year < startYear || d.year > endYear ||
                    d.netflixGrowth < currentRange[0] || d.netflixGrowth > currentRange[1]
                ) ? "none" : "block");
        };
    });
});
