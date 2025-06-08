import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Region bounding boxes (approximate [x0, y0, x1, y1] in geographic coordinates)
const regionBounds = {
    "World": null,
    "Africa": [[-20, -35], [55, 38]],
    "Europe": [[-25, 35], [45, 70]],
    "Asia": [[45, 5], [150, 55]],
    "Americas": [[-130, -55], [-30, 70]],
    "Oceania": [[110, -50], [180, 0]]
};

export function initRegionSelector(svg) {
    const container = d3.select("#region-selector");

    container.append("label")
        .attr("for", "region-select")
        .text("Region: ");

    const select = container.append("select")
        .attr("id", "region-select")
        .on("change", function () {
            const region = this.value;
            zoomToRegion(svg, region);
        });

    select.selectAll("option")
        .data(Object.keys(regionBounds))
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    // Add a globe reset button
    container.append("button")
        .attr("id", "reset-zoom")
        .text("🌍 Reset")
        .on("click", () => zoomToRegion(svg, "World"));
}

function zoomToRegion(svg, region) {
    const g = svg.select("g");
    const bounds = regionBounds[region];

    const projection = d3.geoNaturalEarth1()
        .scale(160)
        .translate([svg.attr("width") / 2, svg.attr("height") / 2]);

    const path = d3.geoPath().projection(projection);

    if (!bounds) {
        g.transition().duration(750)
            .attr("transform", `translate(0,0) scale(1)`);
        return;
    }

    const [[x0, y0], [x1, y1]] = bounds.map(projection);

    const dx = x1 - x0;
    const dy = y1 - y0;
    const x = (x0 + x1) / 2;
    const y = (y0 + y1) / 2;

    const scale = Math.min(8, 0.9 / Math.max(dx / svg.attr("width"), dy / svg.attr("height")));
    const translate = [svg.attr("width") / 2 - scale * x, svg.attr("height") / 2 - scale * y];

    g.transition().duration(750)
        .attr("transform", `translate(${translate}) scale(${scale})`);
}
