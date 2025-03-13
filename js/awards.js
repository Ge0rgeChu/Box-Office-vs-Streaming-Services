class AwardsChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.displayData = [];

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.margin = { top: 20, right: 20, bottom: 70, left: 40 };

        // vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        // vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        vis.width = 500;
        vis.height = 500;

        // SVG drawing area
        vis.svg = d3.select(`#${vis.parentElement}`).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

        // Scales and axes
        vis.x = d3.scaleBand()
            .range([0, vis.width])
            .padding(0.2);

        vis.y = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xAxis = d3.axisBottom()
            .scale(vis.x);

        vis.yAxis = d3.axisLeft()
            .scale(vis.y);

        vis.svg.append("g")
            .attr("class", "x-axis axis")
            .attr("transform", "translate(0," + vis.height + ")");

        vis.svg.append("g")
            .attr("class", "y-axis axis");

        vis.wrangleData();
    }

    wrangleData() {
        // Group data by the distributor

        let vis = this;

        // Create list of distributors
        vis.distributors = [...new Set(vis.data.map(d => d.distributor))];

        // Group data by distributor
        const nomineeByDistributor = d3.group(vis.data, d => d.distributor);

        // put all the distributors into displayData, keeping the distributors with only one nominee together
        let onlyOneNominee = [];

        vis.distributors.forEach((d) => {
            let numberOfNoms = nomineeByDistributor.get(d).length;

            if (numberOfNoms > 1) {
                let tempObj = {
                    distributor: d,
                    numberOfNoms: numberOfNoms,
                    nominees: nomineeByDistributor.get(d)
                };

                vis.displayData.push(tempObj);
            }

            else {
                onlyOneNominee.push(nomineeByDistributor.get(d)[0]);
            }
        });

        // Add all the "other" nominees to displayData
        vis.displayData.push({
            distributor: "Other",
            numberOfNoms: onlyOneNominee.length,
            nominees: onlyOneNominee
        })

        console.log(vis.displayData)

        // Update the visualisation
        vis.updateVis();
    }


    updateVis() {
        let vis = this;

        // Update domains
        vis.x.domain(vis.displayData.map(d => d.distributor));
        vis.y.domain([0, d3.max(vis.displayData, d => d.numberOfNoms)]);

        // Draw rectangles
        let rect = vis.svg.selectAll("rect.awards")
            .data(vis.displayData);

        rect.enter().append("rect")
            .attr("class", "awards")
            .merge(rect)
            .attr("x", d => vis.x(d.distributor))
            .attr("y", d => vis.y(d.numberOfNoms))
            .attr("width", vis.x.bandwidth())
            .attr("height", d => vis.height - vis.y(d.numberOfNoms))
            .attr("fill", d => {
                if (d.distributor == "Netflix" || d.distributor == "Mubi") {
                    return "#D4AF37";
                } else {
                    return "gray";
                }
            });

        rect.exit().remove();

        // Update axes
        vis.svg.select(".x-axis")
            .call(vis.xAxis);

        vis.svg.select(".y-axis")
            .call(vis.yAxis);

        // Rotate axes labels
        vis.svg.selectAll(".x-axis text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.5em");
    }
}