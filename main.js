// Import modules
import { drawMap, updateMapYear } from 'map.js';
import { initSlider } from 'slider.js';
import { initRegionSelector } from 'regions.js';
import { drawLegend } from 'legend.js';
import { showCountryPanel, hidePanel } from 'panel.js';
import { loadAllData } from 'utils.js';

// Global state
let currentYear = 2015;
let allData = {};
let mapSvg = null;

async function init() {
    try {
        // Load all datasets
        allData = await loadAllData();

        // Draw the choropleth map
        mapSvg = drawMap(allData, currentYear, handleCountryClick);

        // Initialize year slider
        initSlider(currentYear, handleYearChange);

        // Initialize region selector and zoom
        initRegionSelector(mapSvg);

        // Add choropleth legend
        drawLegend();

        // Hook up attribution popup if needed
        window.openAttribution = () => {
            window.alert("Data source: OECD Health Statistics, 2025.\nAccessed via https://data-explorer.oecd.org/");
        };

    } catch (err) {
        console.error("Initialisation error:", err);
    }
}

// Slider change → update map
function handleYearChange(newYear) {
    currentYear = newYear;
    updateMapYear(allData, currentYear);
}

// Country clicked → show panel
function handleCountryClick(countryCode) {
    showCountryPanel(countryCode, currentYear, allData);
}

// Hide panel on manual close
document.addEventListener("click", (e) => {
    if (e.target.matches("#close-panel, #country-panel .close")) {
        hidePanel();
    }
});

// Start the app
init();
