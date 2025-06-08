import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { getColorScale } from './utils.js';

export function drawLegend() {
  const container = d3.select("#legend");

  container.append("span").text("Migrant Health Workers (%):");

  // Define example ranges for the legend
  const thresholds = [0, 10, 20, 30, 40];

  thresholds.forEach((value, i) => {
    container.append("span")
      .attr("class", "legend-color")
      .style("background-color", getColorScale(value));

    container.append("span")
      .style("margin-right", "10px")
      .text(`${value}${i === thresholds.length - 1 ? '+' : ''}`);
  });
}
