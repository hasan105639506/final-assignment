// main.js – step 4: show hover tooltips for each country
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

// set svg dimensions
const width = 960;
const height = 500;

// fixed year for now
const currentYear = 2015;

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
            });

        console.log("map rendered with tooltips");
    }).catch(error => {
        console.error("error loading map or data:", error);
    });
