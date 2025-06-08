// main.js – updated interactive panel and trend chart
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

// Set up basic dimensions and projection
const width = 960;
const height = 500;

// Define the bounds for each region for zooming
const regionBounds = {
    "World": null,
    "Africa": [[-20, -35], [55, 38]],
    "Europe": [[-25, 35], [45, 70]],
    "Asia": [[45, 5], [150, 55]],
    "MiddleEast": [[30, 12], [65, 42]],
    "Americas": [[-130, -55], [-30, 70]],
    "Oceania": [[110, -50], [180, 0]]
};

// Current year for the map
let currentYear = 2015;

// Set up the map projection and path generator
const projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([width / 2, height / 2]);

// Create a path generator using the projection
const path = d3.geoPath().projection(projection);

// Create the main SVG container for the map
const svg = d3.select("#map-container")
    .html("")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

// Load all datasets and prepare the data structure
async function loadAllData() {
    const files = await Promise.all([
        d3.csv("data/migration.csv"),
        d3.csv("data/life_expectancy.csv"),
        d3.csv("data/patient_experience.csv"),
        d3.csv("data/perceived_health.csv"),
        d3.csv("data/provider_ratio.csv"),
        d3.csv("data/remuneration.csv"),
        d3.csv("data/health_employment.csv"),
        d3.csv("data/treatable_mortality.csv")
    ]);

    const [migration, life, experience, health, ratio, pay, employment, mortality] = files;

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
        pay: structure(pay),
        employment: structure(employment),
        mortality: structure(mortality)
    };
}

// Zoom to a specific region
function zoomToRegion(region) {
    const bounds = regionBounds[region];
    const g = svg.select("g");

    if (!bounds) {
        g.transition().duration(750).attr("transform", `translate(0,0) scale(1)`);
        return;
    }

    const [[x0, y0], [x1, y1]] = bounds.map(projection);
    const dx = x1 - x0, dy = y1 - y0;
    const x = (x0 + x1) / 2, y = (y0 + y1) / 2;
    const scale = Math.min(8, 0.9 / Math.max(dx / width, dy / height));
    const translate = [width / 2 - scale * x, height / 2 - scale * y];

    g.transition().duration(750).attr("transform", `translate(${translate}) scale(${scale})`);
}

d3.select('#region-buttons button[data-region="World"]').classed("active", true);

// Load the world data and all datasets, then draw the map
Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    loadAllData(),
    d3.csv("data/country_codes.csv")
])
    .then(([worldData, allData, codeMap]) => {
        const countries = feature(worldData, worldData.objects.countries).features;
        const idToAlpha3 = {};
        codeMap.forEach(d => idToAlpha3[d.id] = d.alpha3);
        const color = d3.scaleThreshold()
            .domain([5, 10, 20, 30, 40])
            .range(["#edf8fb", "#b2e2e2", "#66c2a4", "#2ca25f", "#006d2c"]);

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
            .on("mouseover", function (event, d) { // Show tooltip on hover
                const code = idToAlpha3[d.id];
                const val = allData.migration[code]?.[currentYear];
                const name = d.properties.name || code;
                const text = `<strong>${name}</strong><br>${val != null ? val.toFixed(1) + '% migrant workers' : 'no data'}`;
                d3.select("#tooltip").html(text).classed("hidden", false);
                d3.select(this).transition().duration(200).attr("stroke-width", 1.5).attr("stroke", "#111");
            })
            .on("mousemove", function (event) {// Update tooltip position with mouse movement
                d3.select("#tooltip")
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {// Hide tooltip on mouse out
                d3.select("#tooltip").classed("hidden", true);
                d3.select(this).transition().duration(300).attr("stroke-width", 0.5).attr("stroke", "#333");
            })
            .on("click", function (event, d) {// Show country panel on click
                const code = idToAlpha3[d.id];
                const name = d.properties.name || code;
                document.getElementById("map-wrapper").style.transform = "translateX(-200px)";
                document.getElementById("country-panel").classList.add("visible");
                updateCountryPanel(code, name, allData);
            });

        d3.select("#slider").on("input", function () {// Update the map based on the slider value
            currentYear = +this.value;
            d3.select("#year-label").text(currentYear);
            svg.selectAll("path")
                .transition().duration(300)
                .attr("fill", d => {
                    const code = idToAlpha3[d.id];
                    const val = allData.migration[code]?.[currentYear];
                    return val != null ? color(val) : "#ccc";
                });
            if (document.getElementById("country-panel").classList.contains("visible")) {
                const code = document.getElementById("country-panel").dataset.code;
                const name = document.getElementById("country-panel").dataset.name;
                updateCountryPanel(code, name, allData);
            }
        });

        d3.selectAll("#region-buttons button").on("click", function () {// Handle region button clicks
            const region = d3.select(this).attr("data-region");
            zoomToRegion(region);
            d3.selectAll("#region-buttons button").classed("active", false);
            d3.select(this).classed("active", true);
        });
    });

document.getElementById("close-panel").addEventListener("click", () => {// Hide the country panel
    document.getElementById("country-panel").classList.remove("visible");// Reset the map position
    document.getElementById("map-wrapper").style.transform = "translateX(0)";
});

function fmt(value, suffix = '', money = false) {
    if (value == null || isNaN(value)) return 'no data';
    return money ? '$' + Math.round(value).toLocaleString() : value.toFixed(1) + suffix;
}

function drawTrendChart(code, data, focusKey = null) {// Draw the trend chart for a specific country
    const container = d3.select("#trend-chart");
    container.html("");
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = parseInt(container.style("width")) - margin.left - margin.right;
    const height = parseInt(container.style("height")) - margin.top - margin.bottom;
    const years = d3.range(2005, 2022);
    const metrics = [
        { key: "migration", label: "migrant workers (%)" },
        { key: "experience", label: "patient experience (/10)" },
        { key: "health", label: "perceived health (%)" },
        { key: "life", label: "life expectancy (yrs)" },
        { key: "employment", label: "healthcare employment (%)" },
        { key: "mortality", label: "treatable mortality (/100k)" }
    ];

    const seriesData = years.map(year => {
        return metrics.reduce((obj, m) => {
            obj[m.key] = data[m.key][code]?.[year] ?? null;
            return obj;
        }, { year });
    });

    const x = d3.scaleLinear().domain(d3.extent(years)).range([0, width]);
    const allValues = seriesData.flatMap(d => metrics.map(m => d[m.key]).filter(v => v != null));
    const y = d3.scaleLinear().domain([d3.min(allValues), d3.max(allValues)]).nice().range([height, 0]);
    const color = d3.scaleOrdinal().domain(metrics.map(m => m.key)).range(d3.schemeCategory10);
    const line = key => d3.line().defined(d => d[key] != null).x(d => x(d.year)).y(d => y(d[key]));

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));
    svg.append("g").call(d3.axisLeft(y).ticks(5));

    // vertical reference line for current year
    svg.append("line")
        .attr("x1", x(currentYear))
        .attr("x2", x(currentYear))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#333")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 2");

    // label for current year
    svg.append("text")
        .attr("x", x(currentYear) + 4)
        .attr("y", 10)
        .text(currentYear)
        .style("font-size", "10px")
        .style("fill", "#333");

    metrics.forEach(m => {
        svg.append("path")
            .datum(seriesData)
            .attr("fill", "none")
            .attr("stroke", color(m.key))
            .attr("stroke-width", (focusKey && m.key !== focusKey) ? 0.7 : 2)
            .attr("stroke-opacity", (focusKey && m.key !== focusKey) ? 0.4 : 1)
            .attr("d", line(m.key));

        const last = seriesData[seriesData.length - 1];
        if (last[m.key] != null && (!focusKey || m.key === focusKey)) {
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

const statColors = d3.scaleOrdinal()
    .domain(["migration", "experience", "health", "life", "employment", "mortality"])
    .range(d3.schemeCategory10);

const keyLabels = {// Labels for each key in the data
    migration: "Migrant Health Workers",
    life: "Life Expectancy",
    experience: "Patient Experience",
    health: "Perceived Health",
    ratio: "Doctors/Nurses per 1,000",
    pay: "Remuneration",
    employment: "Health Employment",
    mortality: "Treatable Mortality"
};

const keySuffixes = { // Suffixes for each key in the data
    migration: '%',
    life: 'yrs',
    experience: '/10',
    health: '%',
    ratio: '',
    pay: '$',
    employment: '%',
    mortality: ' per 100k'
};

const statDescriptions = {//    Descriptions for each key in the data
    migration: "The percentage of health workers who are foreign-born or trained abroad.",
    life: "The average life expectancy at birth.",
    experience: "Patients’ ratings of their recent healthcare experience.",
    health: "The proportion of people reporting good or very good health.",
    ratio: "Doctors and nurses per 1,000 people.",
    pay: "Average annual income of healthcare workers.",
    employment: "Share of the country’s workforce employed in health.",
    mortality: "Treatable deaths per 100,000 people."
};



function updateCountryPanel(code, name, data) {
    const year = currentYear;
    const panel = document.getElementById("country-panel");
    panel.dataset.code = code;
    panel.dataset.name = name;

    document.getElementById("country-header").innerHTML =
        `<h3>${name} <span style="font-weight:normal; color:#555;">(${year})</span></h3>`;

    const displayKeys = ["migration", "life", "employment", "mortality", "health", "experience"];

    const cardsHTML = displayKeys.map(key => {
        const val = data[key][code]?.[year];
        const value = fmt(val, keySuffixes[key], key === "pay");
        const color = statColors(key);
        return `<div class="stat-card" data-key="${key}" style="border-left: 6px solid ${color};">${keyLabels[key]}<br><strong>${value}</strong></div>`;
    }).join("");

    document.getElementById("stat-cards").innerHTML = cardsHTML;
    document.getElementById("stat-explanation").textContent = "Click a card to learn what it means";

    let selectedKey = null;

    document.querySelectorAll(".stat-card").forEach(el => {
        el.addEventListener("click", () => {
            const key = el.dataset.key;

            if (selectedKey === key) {
                // deselect card
                el.classList.remove("active");
                selectedKey = null;
                drawTrendChart(code, data, null);
                document.getElementById("stat-explanation").textContent = "Click a card to learn what it means";
            } else {
                // select new card
                document.querySelectorAll(".stat-card").forEach(e => e.classList.remove("active"));
                el.classList.add("active");
                selectedKey = key;
                drawTrendChart(code, data, key);
                document.getElementById("stat-explanation").textContent = statDescriptions[key];
            }
        });
    });

    // deselect if user clicks outside the cards
    document.getElementById("country-panel").addEventListener("click", (e) => {
        if (!e.target.classList.contains("stat-card") && selectedKey !== null) {
            selectedKey = null;
            document.querySelectorAll(".stat-card").forEach(e => e.classList.remove("active"));
            drawTrendChart(code, data, null);
            document.getElementById("stat-explanation").textContent = "Click a card to learn what it means";
        }
    });

    drawTrendChart(code, data); // default: all visible
}


document.getElementById("open-attribution").addEventListener("click", (e) => {// Open attribution modal
    e.preventDefault();
    document.getElementById("attribution-modal").classList.remove("hidden");
});

document.getElementById("close-attribution").addEventListener("click", () => {// Close attribution modal
    document.getElementById("attribution-modal").classList.add("hidden");
});
