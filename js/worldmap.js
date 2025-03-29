document.addEventListener("DOMContentLoaded", function() {
    // 1) ADJUSTABLE GLOBAL VARIABLES

    // Some countries in the GeoJSON differ from the CSV names; fix them here:
    const countryNameFix = {
        "USA": "United States",
        "US": "United States",
        "United States of America": "United States",

        // Russia
        "Russia": "Russian Federation",
        "RUS": "Russia",

        // South Korea
        "Republic of Korea": "South Korea",
        "Korea, Rep.": "South Korea",
        "Korea, Republic of": "South Korea",
        "South Korea": "South Korea",

        // North Korea
        "Korea, Dem. People's Rep.": "North Korea",
        "Democratic People's Republic of Korea": "North Korea",

        // Some well-known European countries with alternate names
        "United Kingdom": "United Kingdom",
        "UK": "United Kingdom",
        "GBR": "United Kingdom",
        "Great Britain": "United Kingdom",
        "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",

        "Deutschland": "Germany",
        "DEU": "Germany",
        "Federal Republic of Germany": "Germany",

        "Italia": "Italy",
        "Italian Republic": "Italy",

        "Kingdom of Spain": "Spain",
        "ESP": "Spain",

        "Ivory Coast": "Ivory Coast",

        "People's Republic of China": "China",
        "PRC": "China"
    };

    // Tweak this to reduce GDP's impact in the score:
    let GDP_DIVISOR = 500;

    // 2) SETUP SVG AND MAP
    const width = 700,
        height = 400;

    const svg = d3.select("#world-map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const tooltip = d3.select("#world-map")
        .append("div")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "white")
        .style("padding", "5px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("text-align", "left")
        .style("pointer-events", "none")
        .style("opacity", 0);

    const projection = d3.geoMercator()
        .scale(90)
        .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    // Diverging color scale: -0.3 -> Blue, +0.3 -> Red
    const colorScale = d3.scaleDiverging()
        .domain([-0.3, 0, 0.3])
        .interpolator(t => d3.interpolateRdBu(1 - t));

    // 3) DATA HOLDERS
    let worldGeo,
        netflixByYear = {}, // Summation of Netflix subs per year
        countryRatio = {},  // By-country ratio of Netflix subs
        gdpData = {},       // By country/year
        popData = {},       // By country/year
        boxData = {},       // By country/year
        finalData = {};     // We'll store partial fields (subs, box, pop, gdp)

    // Our valid years: 2012 to 2023
    const years = d3.range(2012, 2024);

    // 4) UTILITY FUNCTIONS
    function parseValue(v) {
        if (!v || v.trim().toLowerCase() === "no data") return null;
        return +v.replace(/[^\d.]/g, "");
    }

    // Sum Netflix data (mm) from quarters -> year
    function computeNetflixByYear(data) {
        data.forEach(d => {
            let val = parseValue(d["Netflix subscribers (mm)"]);
            if (!val) return;
            let y = +d.year;
            netflixByYear[y] = (netflixByYear[y] || 0) + val;
        });
    }

    // Ratio for each country's share of Netflix subscribers
    function computeCountryRatio(data) {
        let total = 0;
        data.forEach(d => {
            let subsText = d.subscribers ? d.subscribers.replace("M","") : "";
            let val = parseValue(subsText) || 0;
            total += val;
        });
        data.forEach(d => {
            let c = d.country.trim();
            let subsText = d.subscribers ? d.subscribers.replace("M","") : "";
            let val = parseValue(subsText) || 0;
            countryRatio[c] = (total > 0) ? val / total : 0;
        });
    }

    // Load GDP data (2012..2023) from the CSV
    function loadGDP(data) {
        data.forEach(d => {
            // Suppose first column is "GDP" for the country
            let cName = d["GDP"];
            if (!cName) return;
            cName = cName.trim();
            if (!gdpData[cName]) gdpData[cName] = {};
            for (let year = 1980; year <= 2024; year++) {
                let val = parseValue(d[year]);
                // We only care about 2012..2023
                if (year >= 2012 && year <= 2023) {
                    gdpData[cName][year] = val ? val * 1e9 : null;
                }
            }
        });
    }

    // Load population data (2012..2023) from the CSV
    function loadPop(data) {
        data.forEach(row => {
            let cName = row.country.trim();
            if (!popData[cName]) popData[cName] = {};
            for (let i = 2000; i <= 2023; i++) {
                let val = parseValue(row[i]);
                if (i >= 2012 && i <= 2023) {
                    popData[cName][i] = val;
                }
            }
        });
    }

    // Load box office data (2012..2023) from the CSV
    function loadBox(data) {
        data.forEach(row => {
            let cName = row.Country.trim();
            let y = +row.Year;
            let val = parseValue(row["Total Worldwide Box Office"]);
            if (!boxData[cName]) boxData[cName] = {};
            // Only store 2012..2023
            if (y >= 2012 && y <= 2023) {
                boxData[cName][y] = val;
            }
        });
    }

    // We'll store partial data (subs, box, pop, gdp) for each country-year
    // Then compute the final "score" at runtime (when we know startYear/endYear).
    function computeFinal() {
        worldGeo.features.forEach(feature => {
            let geoName = feature.properties.name;
            let csvName = countryNameFix[geoName] || geoName;
            if (!finalData[csvName]) finalData[csvName] = {};

            years.forEach(y => {
                let g   = gdpData[csvName]?.[y] || null;
                let p   = popData[csvName]?.[y] || null;
                let b   = boxData[csvName]?.[y] || null;
                let ratio = countryRatio[csvName] || 0;
                let nfTotal = netflixByYear[y] || 0;

                let subs = nfTotal * ratio * 5; // multiply by 5
                finalData[csvName][y] = {
                    subs: subs,
                    box:  b,
                    pop:  p,
                    gdp:  g
                };
            });
        });
    }

    // Sum up fields for a given start..end year range, then compute the popularity score:
    // score = (sumSubs / sumPop) - (sumBox / (sumGDP / GDP_DIVISOR)).
    function computeRangeScoreAndFields(country, startY, endY) {
        let sumSubs = 0,
            sumBox  = 0,
            sumPop  = 0,
            sumGDP  = 0,
            foundAnyData = false;

        for (let y = startY; y <= endY; y++) {
            let info = finalData[country]?.[y];
            if (!info) continue;

            if (info.subs != null) sumSubs += (info.subs * 1e6);
            if (info.box  != null) sumBox  += info.box;
            if (info.pop  != null) sumPop  += info.pop;
            if (info.gdp  != null) sumGDP  += info.gdp;
            foundAnyData = true;
        }

        if (!foundAnyData || sumPop === 0 || sumGDP === 0) {
            return {
                score: null,
                subs: sumSubs,
                box:  sumBox,
                pop:  sumPop,
                gdp:  sumGDP
            };
        }

        // Apply the GDP_DIVISOR to reduce effect of large GDP
        let score = (sumSubs / sumPop) - (sumBox / (sumGDP / GDP_DIVISOR));
        return {
            score,
            subs: sumSubs,
            box:  sumBox,
            pop:  sumPop,
            gdp:  sumGDP
        };
    }

    // This function re-colors the map based on window.startYear..window.endYear
    function updateMap() {
        // Fallback if window.startYear or window.endYear not set
        if (typeof window.startYear === 'undefined') window.startYear = 2012;
        if (typeof window.endYear === 'undefined')   window.endYear   = 2013;

        svg.selectAll("path.map-countries")
            .transition()
            .duration(200)
            .attr("fill", d => {
                let geoName = d.properties.name;
                let csvName = countryNameFix[geoName] || geoName;
                let agg = computeRangeScoreAndFields(csvName, window.startYear, window.endYear);
                if (agg.score == null) {
                    return "#ffffff";
                }
                return colorScale(agg.score);
            });
    }
    // Expose updateMap so script.js can call it
    window.updateMap = updateMap;

    // 5) DATA LOADING & RENDER
    Promise.all([
        // The Netflix quarters -> yearly
        d3.csv("data/NetflixSubscribers2012-2024ByQuarter.csv"),
        // The Netflix by-country ratio
        d3.csv("data/netflix subscribers by country.csv"),
        // The World GDP by year
        d3.csv("data/WorldGDPByYear1980-2023.csv"),
        // The World population by year
        d3.csv("data/WorldPopulationByYear2000-2023.csv"),
        // The box office by year
        d3.csv("data/WorldBoxRevenueByCountry.csv"),
        // The GeoJSON
        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
    ])
        .then(function(files) {
            computeNetflixByYear(files[0]);
            computeCountryRatio(files[1]);
            loadGDP(files[2]);
            loadPop(files[3]);
            loadBox(files[4]);
            worldGeo = files[5];

            computeFinal();

            // Draw map
            svg.append("g")
                .selectAll("path")
                .data(worldGeo.features)
                .enter()
                .append("path")
                .attr("class", "map-countries")
                .attr("d", path)
                .attr("stroke", "#555")
                .attr("stroke-width", 1)
                .attr("fill", "#ffffff")
                .on("mouseover", function(event, d) {
                    // Highlight country outline
                    d3.select(this)
                        .attr("stroke", "yellow")
                        .attr("stroke-width", 2);

                    let geoName = d.properties.name;
                    let csvName = countryNameFix[geoName] || geoName;
                    let agg = computeRangeScoreAndFields(csvName, window.startYear, window.endYear);

                    tooltip.style("opacity", 1);

                    // Format final sums:
                    let scoreVal = agg.score != null ? d3.format(".4f")(agg.score) : "No data";
                    let subsVal  = (agg.subs && agg.subs > 0) ? (d3.format(".2f")(agg.subs / 1e6) + "M") : "No data";
                    let boxVal   = (agg.box && agg.box > 0)   ? ("$" + d3.format(".2s")(agg.box)) : "No data";
                    let popVal   = (agg.pop && agg.pop > 0)   ? d3.format(".2s")(agg.pop)         : "No data";
                    let gdpVal   = (agg.gdp && agg.gdp > 0)   ? ("$" + d3.format(".2s")(agg.gdp)) : "No data";

                    tooltip.html(`
                    <strong>${csvName}</strong><br/>
                    Popularity Score: ${scoreVal}<br/>
                    Netflix Subs: ${subsVal}<br/>
                    Box Office: ${boxVal}<br/>
                    Population: ${popVal}<br/>
                    GDP: ${gdpVal}
                `);
                })
                .on("mousemove", function(event) {
                    tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY + 10) + "px");
                })
                .on("mouseout", function() {
                    // Revert country outline
                    d3.select(this)
                        .attr("stroke", "#555")
                        .attr("stroke-width", 1);
                    tooltip.style("opacity", 0);
                });

            // Title
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", 18)
                .attr("text-anchor", "middle")
                .style("font-size", "24px")
                .style("font-weight", "bold")
                .style("fill", "lightblue")
                .text("Global Entertainment Dominance by Year Range");

            // 6) COLOR LEGEND
            const legendData = d3.range(-0.3, 0.31, 0.1),
                legendWidth = 200,
                legendHeight = 10;

            const legendScale = d3.scaleLinear()
                .domain([-0.3, 0.3])
                .range([0, legendWidth]);
            const legendAxis = d3.axisBottom(legendScale)
                .ticks(6)
                .tickFormat(d3.format(".1f"));

            const lg = svg.append("g")
                .attr("transform", `translate(${(width - legendWidth)/2 + 39},${height - 30})`);

            // Create gradient
            const defs = svg.append("defs");
            const grad = defs.append("linearGradient").attr("id", "grad");
            grad.attr("x1", "0%").attr("x2", "100%")
                .attr("y1", "0%").attr("y2", "0%");

            legendData.forEach((d, i) => {
                grad.append("stop")
                    .attr("offset", (i / (legendData.length - 1)) * 100 + "%")
                    .attr("stop-color", colorScale(d));
            });

            // Legend color bar
            lg.append("rect")
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", "url(#grad)")
                .style("stroke", "#555");

            lg.append("g")
                .attr("transform", `translate(0,${legendHeight})`)
                .call(legendAxis);

            // Explanation text: Netflix vs. Box
            const explanation = svg.append("text")
                .attr("x", (width - legendWidth)/2 + 15)
                .attr("y", height - 45)
                .style("font-size", "12px")
                .style("pointer-events", "none");

            explanation.append("tspan")
                .attr("fill", "blue")
                .text("← Netflix Dominates    ")
                .attr("font-size", "12px")
                .attr("alignment-baseline", "middle");

            explanation.append("tspan")
                .attr("fill", "red")
                .text("Box Office Dominates →")
                .attr("font-size", "12px")
                .attr("alignment-baseline", "middle");

            // "No Data" legend
            svg.append("rect")
                .attr("x", (width - legendWidth)/2 - 150)
                .attr("y", height - 70)
                .attr("width", 15)
                .attr("height", 15)
                .style("fill", "#ffffff")
                .style("stroke", "#555");

            svg.append("text")
                .attr("x", (width - legendWidth)/2 - 130)
                .attr("y", height - 58)
                .style("fill", "#ffffff")
                .text("No Data")
                .attr("font-size", "12px")
                .attr("alignment-baseline", "middle");

            // Finally, color the map for the current global range
            updateMap();
        });
});
