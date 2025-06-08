import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Color scale for choropleth map
const colorScale = d3.scaleThreshold()
    .domain([5, 10, 20, 30, 40])
    .range(["#edf8fb", "#b2e2e2", "#66c2a4", "#2ca25f", "#006d2c"]);

export function getColorScale(value) {
    return colorScale(value);
}

// Helper to load and structure data
export async function loadAllData() {
    const [migration, experience, healthStatus, lifeExpectancy, remuneration, providers] = await Promise.all([
        d3.csv("data/migration.csv"),
        d3.csv("data/patient_experience.csv"),
        d3.csv("data/perceived_health.csv"),
        d3.csv("data/life_expectancy.csv"),
        d3.csv("data/remuneration.csv"),
        d3.csv("data/provider_ratio.csv")
    ]);

    const parseData = (dataset, valueKey = "value") => {
        const result = {};
        dataset.forEach(d => {
            const code = d.country_code;
            const year = +d.year;
            const value = parseFloat(d[valueKey]);

            if (!result[code]) result[code] = {};
            result[code][year] = value;
        });
        return result;
    };

    const countryNames = {};
    migration.forEach(d => {
        if (!countryNames[d.country_code]) {
            countryNames[d.country_code] = d.country_name;
        }
    });

    return {
        migration: parseData(migration),
        experience: parseData(experience),
        healthStatus: parseData(healthStatus),
        lifeExpectancy: parseData(lifeExpectancy),
        remuneration: parseData(remuneration),
        providers: parseData(providers),
        countryNames
    };
}
