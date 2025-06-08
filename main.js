// main.js – Step 2: Load and render world map using D3
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";

// Dimensions for the map SVG
const width = 960;
const height = 500;

// Create a projection and path generator
const projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Create the SVG inside #map-container
const svg = d3.select("#map-container")
    .html("") // Clear the placeholder text
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Load and draw world map
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(worldData => {
    // Convert TopoJSON to GeoJSON
    const countries = feature(worldData, worldData.objects.countries).features;

    // Draw each country as an SVG path
    svg.append("g")
        .selectAll("path")
        .data(countries)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", "#ccc") // Default gray fill
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5);

    console.log("World map rendered.");
}).catch(err => {
    console.error("Failed to load map data:", err);
});
