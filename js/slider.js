export function initSlider(initialYear, onChange) {
    const sliderContainer = document.getElementById("year-slider");

    // Label
    const label = document.createElement("label");
    label.textContent = `Year: `;
    sliderContainer.appendChild(label);

    // Value display
    const yearDisplay = document.createElement("span");
    yearDisplay.id = "slider-year-value";
    yearDisplay.textContent = initialYear;
    label.appendChild(yearDisplay);

    // Slider input
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 2010;
    slider.max = 2020;
    slider.step = 1;
    slider.value = initialYear;
    slider.id = "year-range";
    slider.style.marginLeft = "10px";
    sliderContainer.appendChild(slider);

    // On change
    slider.addEventListener("input", () => {
        const year = +slider.value;
        yearDisplay.textContent = year;
        onChange(year);
    });
}
