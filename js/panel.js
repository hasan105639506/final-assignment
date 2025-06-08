export function showCountryPanel(code, year, data) {
    const panel = document.getElementById("country-panel");
    panel.innerHTML = ""; // Clear previous content

    const countryName = data.countryNames?.[code] || "Unknown Country";
    const countryData = {
        migration: data.migration?.[code]?.[year],
        experience: data.experience?.[code]?.[year],
        healthStatus: data.healthStatus?.[code]?.[year],
        lifeExpectancy: data.lifeExpectancy?.[code]?.[year],
        remuneration: data.remuneration?.[code]?.[year],
        providers: data.providers?.[code]?.[year]
    };

    const ul = document.createElement("ul");

    ul.innerHTML = `
    <li><strong>Migrant Health Workers:</strong> ${formatValue(countryData.migration, "%")}</li>
    <li><strong>Patient Experience Score:</strong> ${formatValue(countryData.experience, "/10")}</li>
    <li><strong>Perceived Good Health:</strong> ${formatValue(countryData.healthStatus, "%")}</li>
    <li><strong>Life Expectancy:</strong> ${formatValue(countryData.lifeExpectancy, "yrs")}</li>
    <li><strong>Doctors/Nurses per 1,000:</strong> ${formatValue(countryData.providers)}</li>
    <li><strong>Avg Remuneration:</strong> ${formatValue(countryData.remuneration, "$", true)}</li>
  `;

    const title = document.createElement("h2");
    title.textContent = `${countryName} (${year})`;

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Back to Global View";
    closeBtn.id = "close-panel";
    closeBtn.onclick = hidePanel;

    panel.appendChild(title);
    panel.appendChild(ul);
    panel.appendChild(closeBtn);

    panel.classList.add("visible");
}

export function hidePanel() {
    document.getElementById("country-panel").classList.remove("visible");
}

function formatValue(value, suffix = "", currency = false) {
    if (value == null || isNaN(value)) return "No data";
    return currency
        ? "$" + Number(value).toLocaleString()
        : Number(value).toFixed(1) + suffix;
}
