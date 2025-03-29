// Define global year range for slider
window.startYear = 2012;
window.endYear = 2023;

document.addEventListener("DOMContentLoaded", () => {
    let sections = document.querySelectorAll(".slide");
    let dots = document.querySelectorAll(".tracker-dot");
    let currentIndex = 0;
    let scrolling = false;

    function updateTracker(index) {
        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === index);
        });
    }

    function scrollToSection(index) {
        if (index >= 0 && index < sections.length) {
            sections[index].scrollIntoView({ behavior: "smooth" });
            currentIndex = index;
            updateTracker(index);
            // Show global slider only for slides 1..3
            if (index >= 1 && index <= 3) {
                document.getElementById('global-slider-container').style.display = 'flex';
            } else {
                document.getElementById('global-slider-container').style.display = 'none';
            }
        }
    }

    window.addEventListener("wheel", (event) => {
        if (scrolling) return;
        scrolling = true;
        setTimeout(() => scrolling = false, 800);

        if (event.deltaY > 0) {
            scrollToSection(currentIndex + 1);
        } else if (event.deltaY < 0) {
            scrollToSection(currentIndex - 1);
        }
    });

    window.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
            scrollToSection(currentIndex + 1);
        } else if (event.key === "ArrowUp") {
            scrollToSection(currentIndex - 1);
        }
    });

    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            scrollToSection(index);
        });
    });
});

// Global horizontal year range slider for controlling worldmap, revenue, price
noUiSlider.create(document.getElementById('global-slider'), {
    start: [2012, 2024],
    connect: true,
    range: { min: 2012, max: 2024 },
    step: 1,
    // No built-in tooltips because we show them in the left/right labels
    tooltips: false
});

document.getElementById('global-slider').noUiSlider.on('update', function(values, handle) {
    const sYear = Math.round(values[0]);
    const eYear = Math.round(values[1]);

    // Update the text labels for start/end year
    document.getElementById('global-slider-left-label').textContent = sYear;
    document.getElementById('global-slider-right-label').textContent = eYear;

    window.startYear = sYear;
    window.endYear = eYear;

    // Update all linked visualizations
    if (typeof updateMap === 'function') {
        updateMap();
    }
    if (typeof priceChart !== 'undefined') {
        priceChart.filterDataByYearRange(sYear, eYear);
    }
    if (typeof window.updateRevenueYears === 'function') {
        window.updateRevenueYears(sYear, eYear);
    }
});
