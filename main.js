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
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%")


// load csv and return data lookup object
async function loadAllData() {
    const files = await Promise.all([
        d3.csv("data/migration.csv"),
        d3.csv("data/life_expectancy.csv"),
        d3.csv("data/patient_experience.csv"),
        d3.csv("data/perceived_health.csv"),
        d3.csv("data/provider_ratio.csv"),
        d3.csv("data/remuneration.csv")
    ]);

    const [migration, life, experience, health, ratio, pay] = files;

    const structure = dataset => {
        const out = {};
        dataset.forEach(d => {
            if (!out[d.country_code]) out[d.country_code] = {};
            out[d.country_code][+d.year] = +d.value;
        });
        return out;
    };

    return {
        migration: structure(migration),
        life: structure(life),
        experience: structure(experience),
        health: structure(health),
        ratio: structure(ratio),
        pay: structure(pay)
    };
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
    loadAllData(),
    d3.csv("data/country_codes.csv")
])
    .then(([worldData, allData, codeMap]) => {
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
                const val = allData.migration[code]?.[currentYear];
                return val != null ? color(val) : "#ccc";
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 0.5)
            .on("mouseover", function (event, d) {
                const code = idToAlpha3[d.id];
                const val = allData.migration[code]?.[currentYear];
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
                const name = d.properties.name || code;

                const stats = {
                    migration: allData.migration[code]?.[currentYear],
                    life: allData.life[code]?.[currentYear],
                    experience: allData.experience[code]?.[currentYear],
                    health: allData.health[code]?.[currentYear],
                    ratio: allData.ratio[code]?.[currentYear],
                    pay: allData.pay[code]?.[currentYear]
                };

                const html = `
                    <h3>${name}</h3>
                    <p><strong>year:</strong> ${currentYear}</p>
                    <p><strong>migrant health workers:</strong> ${fmt(stats.migration, '%')}</p>
                    <p><strong>life expectancy:</strong> ${fmt(stats.life, 'yrs')}</p>
                    <p><strong>patient experience:</strong> ${fmt(stats.experience, '/10')}</p>
                    <p><strong>good perceived health:</strong> ${fmt(stats.health, '%')}</p>
                    <p><strong>doctors/nurses per 1,000:</strong> ${fmt(stats.ratio)}</p>
                    <p><strong>avg remuneration:</strong> ${fmt(stats.pay, '$', true)}</p>
                `;

                d3.select("#country-content").html(html);
                d3.select("#country-panel").classed("visible", true);

                drawTrendChart(code, allData);
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
                    const val = allData.migration[code]?.[currentYear];
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

function fmt(value, suffix = '', money = false) {
    if (value == null || isNaN(value)) return 'no data';
    return money
        ? '$' + Math.round(value).toLocaleString()
        : value.toFixed(1) + suffix;
}

// draw multi-series trend chart for the selected country
function drawTrendChart(code, data) {
    const container = d3.select("#trend-chart");
    container.html(""); // clear previous chart

    // panel-inner dimensions
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = parseInt(container.style("width")) - margin.left - margin.right;
    const height = parseInt(container.style("height")) - margin.top - margin.bottom;

    // years to plot
    const years = d3.range(2010, 2021);

    // which metrics to show
    const metrics = [
        { key: "migration", label: "migrant workers (%)" },
        { key: "experience", label: "patient experience (/10)" },
        { key: "health", label: "perceived health (%)" },
        { key: "life", label: "life expectancy (yrs)" }
    ];

    // build dataset: array of { year, migration, experience, health, life }
    const seriesData = years.map(year => {
        return metrics.reduce((obj, m) => {
            obj[m.key] = data[m.key][code]?.[year] ?? null;
            return obj;
        }, { year });
    });

    // x-scale: years
    const x = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);

    // y-scale: find min & max across all series
    const allValues = seriesData.flatMap(d =>
        metrics.map(m => d[m.key]).filter(v => v != null)
    );
    const y = d3.scaleLinear()
        .domain([d3.min(allValues), d3.max(allValues)])
        .nice()
        .range([height, 0]);

    // color for each series
    const color = d3.scaleOrdinal()
        .domain(metrics.map(m => m.key))
        .range(d3.schemeCategory10);

    // line generator
    const line = key => d3.line()
        .defined(d => d[key] != null)
        .x(d => x(d.year))
        .y(d => y(d[key]));

    // create svg
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));
    svg.append("g")
        .call(d3.axisLeft(y).ticks(5));

    // draw each line
    metrics.forEach(m => {
        svg.append("path")
            .datum(seriesData)
            .attr("fill", "none")
            .attr("stroke", color(m.key))
            .attr("stroke-width", 1.5)
            .attr("d", line(m.key));

        // add label at end of line
        const last = seriesData[seriesData.length - 1];
        if (last[m.key] != null) {
            svg.append("text")
                .attr("x", x(last.year) + 4)
                .attr("y", y(last[m.key]))
                .attr("dy", "0.35em")
                .style("font-size", "0.75rem")
                .style("fill", color(m.key))
                .text(m.label);
        }
    });
}

