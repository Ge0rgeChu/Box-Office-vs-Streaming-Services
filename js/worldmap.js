document.addEventListener("DOMContentLoaded", function() {
    const width = 700, height = 400;

    const svg = d3.select("#world-map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const tooltip = d3.select("#world-map")
        .append("div")
        .style("position", "absolute")
        .style("background-color", "rgba(255,255,255,0.9)")
        .style("padding", "8px")
        .style("border", "1px solid #333")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    const projection = d3.geoMercator()
        .scale(90)
        .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    const colorScale = d3.scaleDiverging()
        .domain([-0.3, 0, 0.3])
        .interpolator(t => d3.interpolateRdBu(1 - t));

    let worldGeo,
        netflixByYear = {},
        countryRatio = {},
        gdpData = {},
        popData = {},
        boxData = {},
        finalData = {};

    const years = d3.range(2012, 2025);
    let currentYear = 2012;

    function parseValue(v) {
        if (!v || v.trim().toLowerCase() === "no data") return null;
        return +v.replace(/[^\d.]/g, "");
    }

    function computeNetflixByYear(data) {
        data.forEach(d => {
            let val = parseValue(d["Netflix subscribers (mm)"]);
            if (!val) return;
            let y = +d.year;
            if (!netflixByYear[y]) netflixByYear[y] = 0;
            netflixByYear[y] += val;
        });
    }

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
            countryRatio[c] = total > 0 ? val / total : 0;
        });
    }

    function loadGDP(data) {
        data.forEach(row => {
            if (!row["GDP"]) return;
            let c = row["GDP"].trim();
            if (!gdpData[c]) gdpData[c] = {};
            for (let i = 1980; i <= 2024; i++) {
                let val = parseValue(row[i]);
                gdpData[c][i] = val ? val * 1e9 : null;
            }
        });
    }

    function loadPop(data) {
        data.forEach(row => {
            let c = row.country.trim();
            if (!popData[c]) popData[c] = {};
            for (let i = 2000; i <= 2023; i++) {
                let val = parseValue(row[i]);
                popData[c][i] = val;
            }
        });
    }

    function loadBox(data) {
        data.forEach(row => {
            let c = row.Country.trim();
            let y = +row.Year;
            let val = parseValue(row["Total Worldwide Box Office"]);
            if (!boxData[c]) boxData[c] = {};
            boxData[c][y] = val;
        });
    }

    function computeFinal() {
        worldGeo.features.forEach(f => {
            let cn = f.properties.name;
            if (!finalData[cn]) finalData[cn] = {};
            years.forEach(y => {
                let g = gdpData[cn]?.[y] || null;
                let p = popData[cn]?.[y] || null;
                let b = boxData[cn]?.[y] || null;
                let ratio = countryRatio[cn] || 0;
                let nfTotal = netflixByYear[y] || null;

                if (!nfTotal || !g || !p || !b) {
                    finalData[cn][y] = null;
                } else {
                    let countrySubs = nfTotal * ratio * 5;
                    let score = (countrySubs * 1e6 / p) - (b / g);
                    finalData[cn][y] = {
                        score: score,
                        subs: countrySubs,
                        box: b,
                        pop: p,
                        gdp: g
                    };
                }
            });
        });
    }

    function updateMap(year) {
        currentYear = year;
        svg.selectAll("path.map-countries")
            .transition()
            .duration(200)
            .attr("fill", d => {
                let cn = d.properties.name;
                let info = finalData[cn]?.[year];
                if (!info) return "#ffffff";
                return colorScale(info.score);
            });
        d3.select("#slider-year-label").text("Year: " + year);
    }

    Promise.all([
        d3.csv("data/NetflixSubscribers2012-2024ByQuarter.csv"),
        d3.csv("data/netflix subscribers by country.csv"),
        d3.csv("data/WorldGDPByYear1980-2023.csv"),
        d3.csv("data/WorldPopulationByYear2000-2023.csv"),
        d3.csv("data/WorldBoxRevenueByCountry.csv"),
        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
    ]).then(function(files) {
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
            .attr("stroke", "#333")
            .attr("fill", "#ffffff")
            .on("mouseover", function(event, d) {
                let cn = d.properties.name;
                let info = finalData[cn]?.[currentYear] || null;
                tooltip.style("opacity", 1);

                if (!info) {
                    tooltip.html(`
                        <strong style="color: blue;">${cn}</strong><br/>
                        <span style="color: #444;">No data</span>
                    `);
                } else {
                    let fmt = d3.format(".2s");
                    let scoreFmt = d3.format(".4f");
                    tooltip.html(`
                        <strong style="color: blue;">${cn}</strong><br/>
                        <span style="color: #444;">
                          Popularity Score: ${scoreFmt(info.score)}<br/>
                          Netflix Subs: ${d3.format(".2f")(info.subs)}M<br/>
                          Box Office: $${fmt(info.box)}<br/>
                          Population: ${fmt(info.pop)}<br/>
                          GDP: $${fmt(info.gdp)}
                        </span>
                    `);
                }
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("opacity", 0);
            });

        // Main title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .style("font-weight", "bold")
            .style("fill", "lightblue")
            .text("Global Entertainment Dominance by Year");

        // Legend
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
            .attr("transform", `translate(${(width - legendWidth)/2},${height - 30})`);

        const defs = svg.append("defs");
        const grad = defs.append("linearGradient").attr("id", "grad");
        grad.attr("x1", "0%").attr("x2", "100%").attr("y1", "0%").attr("y2", "0%");

        legendData.forEach((d, i) => {
            grad.append("stop")
                .attr("offset", (i / (legendData.length - 1)) * 100 + "%")
                .attr("stop-color", colorScale(d));
        });

        lg.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#grad)")
            .style("stroke", "#333");

        lg.append("g")
            .attr("transform", "translate(0,10)")
            .call(legendAxis);

        const expl = svg.append("text")
            .attr("x", (width - legendWidth)/2)
            .attr("y", height - 45)
            .style("font-size", "12px")
            .style("pointer-events", "none");

        expl.append("tspan")
            .attr("fill", "blue")
            .text("← Netflix Dominates    ");

        expl.append("tspan")
            .attr("fill", "red")
            .text("Box Office Dominates →");

        svg.append("rect")
            .attr("x", (width - legendWidth)/2 - 70)
            .attr("y", height - 70)
            .attr("width", 15)
            .attr("height", 15)
            .style("fill", "#ffffff")
            .style("stroke", "#333");

        svg.append("text")
            .attr("x", (width - legendWidth)/2 - 50)
            .attr("y", height - 58)
            .style("fill", "#444")
            .text("No Data");

        let sliderContainer = d3.select("#world-map")
            .append("div")
            .style("display", "flex")
            .style("flex-direction", "column")
            .style("align-items", "center")
            .style("margin-top", "10px");

        sliderContainer.append("div")
            .attr("id", "slider-year-label")
            .style("margin-bottom", "6px")
            .style("font-weight", "bold")
            .text("Year: " + currentYear);

        let slider = sliderContainer.append("input")
            .attr("type", "range")
            .attr("min", 2012)
            .attr("max", 2024)
            .attr("value", currentYear)
            .attr("step", 1)
            .style("width", "150px")
            .style("accent-color", "darkblue")
            .on("input", function() {
                let val = +d3.select(this).property("value");
                updateMap(val);
            });

        updateMap(2012);
    });
});
