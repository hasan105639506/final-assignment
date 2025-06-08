// main.js – step 4: show hover tooltips for each country
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

// set svg dimensions
const width = 960;
const height = 500;

// define region bounds for zooming
const regionBounds = {
    "World": null,
    "Africa": [[-20, -35], [55, 38]],
    "Europe": [[-25, 35], [45, 70]],
    "Asia": [[45, 5], [150, 55]],
    "MiddleEast": [[30, 12], [65, 42]],
    "Americas": [[-130, -55], [-30, 70]],
    "Oceania": [[110, -50], [180, 0]]
};

// set initial year for migration data
let currentYear = 2015;

// create projection and path generator
const projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// select container and add svg
const svg = d3.select("#map-container")
    .html("") // clear placeholder
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// load csv and return data lookup object
async function loadMigrationData() {
    const raw = await d3.csv("data/migration.csv");
    const lookup = {};

    raw.forEach(row => {
        const code = row.country_code;
        const year = +row.year;
        const value = parseFloat(row.value);

        if (!lookup[code]) lookup[code] = {};
        lookup[code][year] = value;
    });

    return lookup;
}

// zoom to specific region based on selection
function zoomToRegion(region) {
    const bounds = regionBounds[region];
    const g = svg.select("g");

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

    const scale = Math.min(8, 0.9 / Math.max(dx / width, dy / height));
    const translate = [width / 2 - scale * x, height / 2 - scale * y];

    g.transition().duration(750)
        .attr("transform", `translate(${translate}) scale(${scale})`);
}

// load map and data in parallel
Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    loadMigrationData(),
    d3.csv("data/country_codes.csv")
])
    .then(([worldData, migrationData, codeMap]) => {
        const countries = feature(worldData, worldData.objects.countries).features;

        // create id → alpha3 lookup
        const idToAlpha3 = {};
        codeMap.forEach(d => {
            idToAlpha3[d.id] = d.alpha3;
        });

        // define color scale
        const color = d3.scaleThreshold()
            .domain([5, 10, 20, 30, 40])
            .range(["#edf8fb", "#b2e2e2", "#66c2a4", "#2ca25f", "#006d2c"]);

        // draw map with hover tooltip
        svg.append("g")
            .selectAll("path")
            .data(countries)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", d => {
                const code = idToAlpha3[d.id];
                const val = migrationData[code]?.[currentYear];
                return val != null ? color(val) : "#ccc";
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5)
            .on("mouseover", function (event, d) {
                const code = idToAlpha3[d.id];
                const val = migrationData[code]?.[currentYear];
                const name = d.properties.name || code;
                const text = `<strong>${name}</strong><br>${val != null ? val.toFixed(1) + '% migrant workers' : 'no data'}`;

                d3.select("#tooltip")
                    .html(text)
                    .classed("hidden", false);

                d3.select(this).attr("stroke-width", 1.5);
            })
            .on("mousemove", function (event) {
                d3.select("#tooltip")
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select("#tooltip").classed("hidden", true);
                d3.select(this).attr("stroke-width", 0.5);
            })
            .on("click", function (event, d) {
                const code = idToAlpha3[d.id];
                const val = migrationData[code]?.[currentYear];
                const name = d.properties.name || code;

                const html = `
                    <h3>${name}</h3>
                    <p><strong>year:</strong> ${currentYear}</p>
                    <p><strong>migrant health workers:</strong> ${val != null ? val.toFixed(1) + '%' : 'no data'}</p>
                    `;

                d3.select("#country-content").html(html);
                d3.select("#country-panel").classed("visible", true);
            });


        // update map when year changes
        d3.select("#slider").on("input", function () {
            currentYear = +this.value;
            d3.select("#year-label").text(currentYear);

            // update map colors
            svg.selectAll("path")
                .transition()
                .duration(300)
                .attr("fill", d => {
                    const code = idToAlpha3[d.id];
                    const val = migrationData[code]?.[currentYear];
                    return val != null ? color(val) : "#ccc";
                });
        });

        // handle region selection
        d3.select("#region-select").on("change", function () {
            const region = this.value;
            zoomToRegion(region);
        });

        // reset button returns to full view
        d3.select("#reset-view").on("click", () => {
            zoomToRegion("World");
        });

        console.log("map rendered with tooltips");
    }).catch(error => {
        console.error("error loading map or data:", error);
    });

// close detail panel
document.getElementById("close-panel").addEventListener("click", () => {
    d3.select("#country-panel").classed("visible", false);
});

