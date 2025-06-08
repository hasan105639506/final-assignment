import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";
import { getColorScale } from './utils.js';

let svg, path, tooltip;

export function drawMap(data, year, onCountryClick) {
    const width = 960;
    const height = 500;

    const projection = d3.geoNaturalEarth1()
        .scale(160)
        .translate([width / 2, height / 2]);

    path = d3.geoPath().projection(projection);

    svg = d3.select("#map-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(worldData => {
        const countries = feature(worldData, worldData.objects.countries).features;

        svg.append("g")
            .selectAll("path")
            .data(countries)
            .enter().append("path")
            .attr("d", path)
            .attr("class", "country")
            .attr("fill", d => {
                const code = d.id;
                console.log("Looking up", d.id, data.migration?.[d.id]?.[year]);
                const val = data?.migration?.[code]?.[year];
                return val != null ? getColorScale(val) : "#ccc";
            })
            .on("mouseover", function (event, d) {
                d3.select(this).attr("stroke", "#000").attr("stroke-width", 1.5);

                const code = d.id;
                const val = data?.migration?.[code]?.[year];
                tooltip.transition().duration(200).style("opacity", 1);
                tooltip.html(`<strong>${d.properties.name}</strong><br/>Migrant Workers: ${val != null ? val.toFixed(1) + "%" : "No data"}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).attr("stroke", null);
                tooltip.transition().duration(500).style("opacity", 0);
            })
            .on("click", function (event, d) {
                const code = d.id;
                onCountryClick(code);
            });
    });

    return svg;
}

export function updateMapYear(data, year) {
    svg.selectAll("path.country")
        .transition()
        .duration(500)
        .attr("fill", d => {
            const code = d.id;
            const val = data?.migration?.[code]?.[year];
            return val != null ? getColorScale(val) : "#ccc";
        });
}
