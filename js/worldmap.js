document.addEventListener("DOMContentLoaded", function() {
    const width = 800,
        height = 500;

    const svg = d3.select("#world-map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const projection = d3.geoMercator()
        .scale(130)
        .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    const color = d3.scaleDiverging()
        .domain([-0.5, 0, 0.5])
        .interpolator(t => d3.interpolateRdBu(1 - t));

    const popul = d3.randomNormal(0, 0.15);

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    Promise.all([
        d3.csv("data/all-weeks-countries.csv"),
        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
    ]).then(([csvData, worldData]) => {

        let popMapping = {};
        csvData.forEach(d => {
            let code = d.Code || d["Country Code"];
            if (code) {
                popMapping[code.toUpperCase()] = clamp(popul(), -0.5, 0.5);
            }
        });
        worldData.features.forEach(feature => {
            let isoCode = feature.properties.iso_a2;
            if (isoCode && popMapping[isoCode.toUpperCase()] !== undefined) {
                feature.properties.popDiff = popMapping[isoCode.toUpperCase()];
            } else {
                feature.properties.popDiff = clamp(popul(), -0.5, 0.5);
            }
        });

        svg.append("g")
            .selectAll("path")
            .data(worldData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => color(d.properties.popDiff))
            .attr("stroke", "#999")
            .attr("stroke-width", 0.5)
            .append("title")
            .text(d => `${d.properties.name}: ${d3.format(".0%")(d.properties.popDiff)}`);

        const legendWidth = 300,
            legendHeight = 10;

        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${(width - legendWidth) / 2}, ${height - 40})`);

        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "legend-gradient");

        const stops = d3.range(0, 1.01, 0.1);
        stops.forEach(t => {
            gradient.append("stop")
                .attr("offset", `${t * 100}%`)
                .attr("stop-color", color(-0.5 + t * 1));
        });

        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)")
            .style("stroke", "#999")
            .style("stroke-width", "0.5");

        const legendScale = d3.scaleLinear()
            .domain([-0.5, 0.5])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5)
            .tickFormat(d3.format(".0%"));

        legend.append("g")
            .attr("transform", `translate(0, ${legendHeight})`)
            .call(legendAxis);

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height - 50)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "white")
            .text("Diverging Color Scale: Blue = Films Popular, Red = Streaming Popular");

        let title = svg.append("text")
            .attr("class", "map-title")
            .attr("x", width / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .style("fill", "white")
            .style("font-weight", "bold")
            .text("Popularity Data - 2023");
        title.raise();
    }).catch(error => {
        console.error("Error loading data: ", error);
    });
});
