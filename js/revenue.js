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

    console.log("Loading data...");

    Promise.all([
        d3.csv("data/BoxOfficeRevenueByQuarter2001-2024.csv"),
        d3.csv("data/NetflixSubscribers2012-2024ByQuarter.csv")
    ]).then(([boxOfficeData, netflixData]) => {
        console.log("Box Office Data Loaded:", boxOfficeData);
        console.log("Netflix Data Loaded:", netflixData);

        const quarterOrder = { "q1": 1, "q2": 2, "q3": 3, "q4": 4 };

        let boxOffice = boxOfficeData.map(d => ({
            year: +d.Year,
            quarter: d.quarter.toLowerCase(), // standardize to lowercase
            revenue: +d["Cumulative Gross"].replace(/[$, ]/g, "")
        }));

        boxOffice.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return quarterOrder[a.quarter] - quarterOrder[b.quarter];
        });

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

            let prev = boxOffice.find(b => b.year === expectedYear && b.quarter === expectedQuarter);
            if (prev) {
                d.growth = (d.revenue - prev.revenue) / prev.revenue;
            } else {
                d.growth = null;
            }
        });

        let netflix = netflixData.map(d => ({
            year: +d.year,
            quarter: d.quarter.toLowerCase(),
            subscribers: +d["Netflix subscribers (mm)"]
        }));

        netflix.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return quarterOrder[a.quarter] - quarterOrder[b.quarter];
        });

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

        const xScale = d3.scaleTime()
            .domain([
                new Date(mergedData[0].year, (quarterOrder[mergedData[0].quarter] - 1) * 3),
                new Date(mergedData[mergedData.length - 1].year, (quarterOrder[mergedData[mergedData.length - 1].quarter] - 1) * 3)
            ])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([-1.0, 1.0])
            .range([height, 0]);

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

        svg.append("path")
            .datum(mergedData)
            .attr("fill", "none")
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("d", lineBox);

        svg.append("path")
            .datum(mergedData)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("d", lineNetflix);

        const xAxis = d3.axisBottom(xScale)
            .ticks(d3.timeYear.every(2))
            .tickFormat(d3.timeFormat("%Y"));
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis);

        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format(".0%"));
        svg.append("g")
            .call(yAxis);

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

        svg.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(0))
            .attr("y2", yScale(0))
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,4");

        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 100}, 10)`);

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
