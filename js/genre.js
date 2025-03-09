const margin = { top: 40, right: 120, bottom: 100, left: 80 };
const width = 900 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;
const platformColors = {
  "Netflix": "#E50914",
  "Hulu": "#1CE783",
  "Prime Video": "#00A8E1",
  "Disney+": "#113CCF"
};
const svg = d3.select("#genre-chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("text-align", "center")
  .style("padding", "6px")
  .style("font", "12px sans-serif")
  .style("background", "lightsteelblue")
  .style("border", "0px")
  .style("border-radius", "8px")
  .style("pointer-events", "none")
  .style("opacity", 0);
let combinedData, activePlatforms = {
  "Netflix": true,
  "Hulu": true,
  "Prime Video": true,
  "Disney+": true
};
Promise.all([
  d3.csv("data/MoviesOnStreamingPlatforms_updated.csv"),
  d3.csv("data/imdb_movie_dataset.csv")
]).then(function([streamingData, boxOfficeData]) {
  const genreCounts = {};
  streamingData.forEach(d => {
    if (d.Genres) {
      d.Genres.split(",").forEach(genre => {
        genre = genre.trim();
        if (!genreCounts[genre]) {
          genreCounts[genre] = { "Netflix": 0, "Hulu": 0, "Prime Video": 0, "Disney+": 0 };
        }
        if (d.Netflix === "1") genreCounts[genre].Netflix += 1;
        if (d.Hulu === "1") genreCounts[genre].Hulu += 1;
        if (d["Prime Video"] === "1") genreCounts[genre]["Prime Video"] += 1;
        if (d["Disney+"] === "1") genreCounts[genre]["Disney+"] += 1;
      });
    }
  });
  const boxOfficeRevenue = {};
  boxOfficeData.forEach(d => {
    if (d.Genre && d["Revenue (Millions)"]) {
      d.Genre.split(",").forEach(genre => {
        genre = genre.trim();
        boxOfficeRevenue[genre] = (boxOfficeRevenue[genre] || 0) + parseFloat(d["Revenue (Millions)"]);
      });
    }
  });
  const commonGenres = Object.keys(genreCounts).filter(genre => boxOfficeRevenue[genre]);
  combinedData = commonGenres.map(genre => ({
    genre: genre,
    streaming: genreCounts[genre],
    boxOfficeRevenue: boxOfficeRevenue[genre]
  })).sort((a, b) => b.boxOfficeRevenue - a.boxOfficeRevenue);
  const xScale = d3.scaleBand()
    .domain(combinedData.map(d => d.genre))
    .range([0, width])
    .padding(0.2);
  const yScaleLeft = d3.scaleLinear()
    .domain([0, d3.max(combinedData, d =>
      d.streaming.Netflix + d.streaming.Hulu + d.streaming["Prime Video"] + d.streaming["Disney+"])])
    .range([height, 0]);
  const yScaleRight = d3.scaleLinear()
    .domain([0, d3.max(combinedData, d => d.boxOfficeRevenue)])
    .range([height, 0]);
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");
  svg.append("g").call(d3.axisLeft(yScaleLeft));
  svg.append("g")
    .attr("transform", `translate(${width},0)`)
    .call(d3.axisRight(yScaleRight));
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 30)
    .attr("text-anchor", "middle")
    .text("Movie Genre");
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 15)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Number of Movies on Streaming Platforms");
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", width + margin.right - 40)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Total Box Office Revenue (Millions)");
  svg.append("path")
    .datum(combinedData)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .x(d => xScale(d.genre) + xScale.bandwidth() / 2)
      .y(d => yScaleRight(d.boxOfficeRevenue))
    );
  svg.selectAll(".dot")
    .data(combinedData)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.genre) + xScale.bandwidth() / 2)
    .attr("cy", d => yScaleRight(d.boxOfficeRevenue))
    .attr("r", 4)
    .attr("fill", "red")
    .on("mouseover", function(event, d) {
      tooltip.style("opacity", 1)
        .html(`Genre: ${d.genre}<br>Revenue: ${d.boxOfficeRevenue}M`);
    })
    .on("mousemove", function(event, d) {
      tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity", 0);
    });
  let legend = svg.append("g")
    .attr("transform", `translate(${width - 160},0)`);
  Object.keys(platformColors).forEach((platform, i) => {
    legend.append("rect")
      .attr("x", 0)
      .attr("y", i * 20)
      .attr("width", 12)
      .attr("height", 12)
      .style("fill", platformColors[platform])
      .style("cursor", "pointer")
      .on("click", function() {
        activePlatforms[platform] = !activePlatforms[platform];
        d3.select(this).style("opacity", activePlatforms[platform] ? 1 : 0.5);
        updateChart();
      });
    legend.append("text")
      .attr("x", 20)
      .attr("y", i * 20 + 10)
      .text(platform)
      .style("font-size", "12px")
      .attr("alignment-baseline", "middle")
      .style("cursor", "pointer")
      .on("click", function() {
        activePlatforms[platform] = !activePlatforms[platform];
        legend.selectAll("rect").filter((d, idx) => idx === i)
          .style("opacity", activePlatforms[platform] ? 1 : 0.5);
        updateChart();
      });
  });
  legend.append("circle")
    .attr("cx", 0)
    .attr("cy", Object.keys(platformColors).length * 20 + 10)
    .attr("r", 6)
    .style("fill", "red");
  legend.append("text")
    .attr("x", 20)
    .attr("y", Object.keys(platformColors).length * 20 + 15)
    .text("Box Office Revenue")
    .style("font-size", "12px")
    .attr("alignment-baseline", "middle");
  function handleMouseOver(event, d) {
    tooltip.style("opacity", 1)
      .html(`Genre: ${d.genre}<br>Platform: ${d.platform}<br>Count: ${d.data[1] - d.data[0]}`);
  }
  function handleMouseMove(event, d) {
    tooltip.style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
  }
  function handleMouseOut() {
    tooltip.style("opacity", 0);
  }
  function updateChart() {
    let filteredStreamingData = combinedData.map(d => {
      let obj = {};
      Object.keys(platformColors).forEach(key => {
        obj[key] = activePlatforms[key] ? d.streaming[key] : 0;
      });
      return obj;
    });
    let stack = d3.stack().keys(Object.keys(platformColors));
    let stackedData = stack(filteredStreamingData);
    let layers = svg.selectAll("g.layer")
      .data(stackedData, d => d.key);
    layers.exit().remove();
    let layersEnter = layers.enter()
      .append("g")
      .attr("class", "layer")
      .attr("fill", d => platformColors[d.key]);
    layers = layersEnter.merge(layers);
    let rects = layers.selectAll("rect")
      .data(function(d, i) {
        return d.map((p, j) => ({ data: p, platform: d.key, genre: combinedData[j].genre }));
      });
    rects.exit().remove();
    rects.transition().duration(500)
      .attr("x", d => xScale(d.genre))
      .attr("y", d => yScaleLeft(d.data[1]))
      .attr("height", d => yScaleLeft(d.data[0]) - yScaleLeft(d.data[1]))
      .attr("width", xScale.bandwidth());
    rects.enter()
      .append("rect")
      .attr("x", d => xScale(d.genre))
      .attr("y", d => yScaleLeft(d.data[1]))
      .attr("height", d => yScaleLeft(d.data[0]) - yScaleLeft(d.data[1]))
      .attr("width", xScale.bandwidth())
      .on("mouseover", handleMouseOver)
      .on("mousemove", handleMouseMove)
      .on("mouseout", handleMouseOut);
  }
  updateChart();
  svg.selectAll("path").raise();
  svg.selectAll(".dot").raise();
});
