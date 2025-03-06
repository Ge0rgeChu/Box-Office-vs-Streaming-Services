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
