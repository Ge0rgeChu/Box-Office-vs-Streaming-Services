document.addEventListener("DOMContentLoaded", function () {
    // Set dimensions (increased bottom margin for x-axis label)
    const margin = { top: 50, right: 50, bottom: 70, left: 70 },
        width = 800 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select("#box-office-streaming-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    console.log("Loading data...");

    Promise.all([
        d3.csv("data/BoxOfficeRevenueByQuarter2001-2024.csv"),
        d3.csv("data/NetflixSubscribers2012-2024ByQuarter.csv")
    ]).then(([boxOfficeData, netflixData]) => {
        console.log("Box Office Data Loaded:", boxOfficeData);
        console.log("Netflix Data Loaded:", netflixData);

        // Define quarter order mapping for sorting and month conversion
        const quarterOrder = { "q1": 1, "q2": 2, "q3": 3, "q4": 4 };

        // Process box office data
        let boxOffice = boxOfficeData.map(d => ({
            year: +d.Year,
            quarter: d.quarter.toLowerCase(), // standardize to lowercase
            revenue: +d["Cumulative Gross"].replace(/[$, ]/g, "")
        }));

        // Sort box office data by year and quarter order ascending
        boxOffice.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return quarterOrder[a.quarter] - quarterOrder[b.quarter];
        });

        // Compute quarter-over-quarter growth for box office
        boxOffice.forEach((d, i) => {
            if (i === 0) {
                d.growth = null;
                return;
            }
            let expectedYear = d.year;
            let expectedQuarter;
            if (d.quarter === "q1") {
                expectedYear = d.year - 1;
                expectedQuarter = "q4";
            } else {
                const currentOrder = quarterOrder[d.quarter];
                for (const q in quarterOrder) {
                    if (quarterOrder[q] === currentOrder - 1) {
                        expectedQuarter = q;
                        break;
                    }
                }
            }
            // Find the record matching the expected previous quarter
            let prev = boxOffice.find(b => b.year === expectedYear && b.quarter === expectedQuarter);
            if (prev) {
                d.growth = (d.revenue - prev.revenue) / prev.revenue;
            } else {
                d.growth = null;
            }
        });

        // Process Netflix data
        let netflix = netflixData.map(d => ({
            year: +d.year,
            quarter: d.quarter.toLowerCase(),
            subscribers: +d["Netflix subscribers (mm)"]
        }));

        // Sort Netflix data by year and quarter order ascending
        netflix.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return quarterOrder[a.quarter] - quarterOrder[b.quarter];
        });

        // Compute quarter-over-quarter growth for Netflix data
        netflix.forEach((d, i) => {
            if (i === 0) {
                d.growth = null;
                return;
            }
            let expectedYear = d.year;
            let expectedQuarter;
            if (d.quarter === "q1") {
                expectedYear = d.year - 1;
                expectedQuarter = "q4";
            } else {
                const currentOrder = quarterOrder[d.quarter];
                for (const q in quarterOrder) {
                    if (quarterOrder[q] === currentOrder - 1) {
                        expectedQuarter = q;
                        break;
                    }
                }
            }
            let prev = netflix.find(n => n.year === expectedYear && n.quarter === expectedQuarter);
            if (prev) {
                d.growth = (d.subscribers - prev.subscribers) / prev.subscribers;
            } else {
                d.growth = null;
            }
        });

        console.log("Processed Box Office Data:", boxOffice);
        console.log("Processed Netflix Data:", netflix);

        // Merge datasets by matching year and quarter
        let mergedData = boxOffice.map(d => {
            let netflixEntry = netflix.find(n => n.year === d.year && n.quarter === d.quarter);
            return {
                year: d.year,
                quarter: d.quarter,
                boxGrowth: d.growth,
                netflixGrowth: netflixEntry ? netflixEntry.growth : null
            };
        }).filter(d => d.boxGrowth !== null && d.netflixGrowth !== null);

        console.log("Merged Data:", mergedData);

        // Create scales
        // Use the start month of the quarter (subtracting 1 from quarter order, then multiply by 3)
        const xScale = d3.scaleTime()
            .domain([
                new Date(mergedData[0].year, (quarterOrder[mergedData[0].quarter] - 1) * 3),
                new Date(mergedData[mergedData.length - 1].year, (quarterOrder[mergedData[mergedData.length - 1].quarter] - 1) * 3)
            ])
            .range([0, width]);

        // For the y-axis, set the domain to fixed values: from -50% to +30%
        const yScale = d3.scaleLinear()
            .domain([-1.0, 1.0])
            .range([height, 0]);

        // Line generators using the scales
        const lineBox = d3.line()
            .x(d => {
                const date = new Date(d.year, (quarterOrder[d.quarter] - 1) * 3);
                return xScale(date);
            })
            .y(d => yScale(d.boxGrowth));

        const lineNetflix = d3.line()
            .x(d => {
                const date = new Date(d.year, (quarterOrder[d.quarter] - 1) * 3);
                return xScale(date);
            })
            .y(d => yScale(d.netflixGrowth));

        // Draw the box office growth line (blue)
        svg.append("path")
            .datum(mergedData)
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("d", lineBox);

        // Draw the Netflix growth line (red)
        svg.append("path")
            .datum(mergedData)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", lineNetflix);

        // Add x-axis (横坐标) with ticks every 2 years for larger spacing
        const xAxis = d3.axisBottom(xScale)
            .ticks(d3.timeYear.every(2))
            .tickFormat(d3.timeFormat("%Y"));
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis);

        // Add y-axis (纵坐标) with percentage formatting
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format(".0%"));
        svg.append("g")
            .call(yAxis);

        // Axis labels
        // x-axis label
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + margin.bottom - 10)
            .text("Year");

        // y-axis label (rotated)
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -margin.top)
            .text("Growth Rate (%)");

        // Add a horizontal reference line at 0% growth
        svg.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(0))   // yScale(0) => the vertical position of 0%
            .attr("y2", yScale(0))
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,4"); // optional dashed line


        // Add a legend for the lines
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 100}, 10)`);

        // Legend item for Box Office Growth (blue)
        legend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", "blue");

        legend.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .text("Box Office Growth")
            .style("font-size", "12px")
            .attr("alignment-baseline", "middle");

        // Legend item for Netflix Growth (red)
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
    });
});
