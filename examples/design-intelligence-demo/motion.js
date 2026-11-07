/* Atelier Kōhaku — scroll motion.
   Dependency-free equivalents of three behaviours proven in the reference
   bundle: GSAP ScrollTrigger line reveals (yPercent 101 → 0, 1.109s, default
   power1.out), the hero image settle (scale 1.1 → 1, 2.4s) and the fixed
   scroll-progress bar (.yap, 4px, scaleX, transform-origin left).

   Content is never hidden unless this script runs, and prefers-reduced-motion
   disables every part of it. All values are recorded in design-memory.json. */

(() => {
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const progress = document.createElement("div");
  progress.className = "motion-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);

  let ticking = false;
  const updateProgress = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progress.style.transform = `scaleX(${value})`;
  };
  const requestProgress = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateProgress);
  };

  updateProgress();
  window.addEventListener("scroll", requestProgress, { passive: true });
  window.addEventListener("resize", requestProgress, { passive: true });

  if (!("IntersectionObserver" in window)) return;

  /* The reference splits headings and lifts each line from below a clipped
     edge. The demo lifts the whole heading as one clipped block, so the
     reference's 0.1s per-line stagger is deliberately not reproduced. */
  const headings = document.querySelectorAll(
    ".intro-title, .approach-title, .section-heading, .quote p, .footer-wordmark",
  );
  headings.forEach((heading) => {
    const rise = document.createElement("span");
    rise.className = "rise";
    while (heading.firstChild) rise.appendChild(heading.firstChild);
    heading.appendChild(rise);
    heading.classList.add("reveal-mask");
  });

  /* The reference declares opacity 0.3s on its project images; the fade is
     triggered on entry here because the demo has no preloader or router. */
  const images = document.querySelectorAll(
    ".intro-media, .approach-media, .project img",
  );
  images.forEach((image) => image.classList.add("reveal-img"));

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-inview");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
  );

  document
    .querySelectorAll(".reveal-mask, .reveal-img")
    .forEach((target) => observer.observe(target));

  reduceQuery.addEventListener?.("change", updateProgress);
})();
