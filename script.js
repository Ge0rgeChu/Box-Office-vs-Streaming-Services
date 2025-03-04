document.addEventListener("DOMContentLoaded", () => {
    console.log("Website Loaded!");

    const visualBoxes = document.querySelectorAll(".visual-box");

    const fadeInElements = () => {
        visualBoxes.forEach((box) => {
            let position = box.getBoundingClientRect().top;
            let screenHeight = window.innerHeight / 1.3;

            if (position < screenHeight) {
                box.style.opacity = "1";
                box.style.transform = "translateY(0)";
            }
        });
    };

    window.addEventListener("scroll", fadeInElements);
    fadeInElements();

    visualBoxes.forEach((box) => {
        box.addEventListener("mouseover", () => {
            box.style.boxShadow = "0px 6px 30px rgba(255, 255, 255, 0.5)";
        });

        box.addEventListener("mouseleave", () => {
            box.style.boxShadow = "0px 4px 20px rgba(255, 255, 255, 0.2)";
        });
    });
});
