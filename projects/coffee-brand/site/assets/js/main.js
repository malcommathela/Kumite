"use strict";

(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Header state ---------- */

  var header = document.querySelector("[data-header]");
  if (header) {
    var ticking = false;
    var syncHeader = function () {
      header.classList.toggle("is-raised", window.scrollY > 24);
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(syncHeader);
      }
    }, { passive: true });
    syncHeader();
  }

  /* ---------- Toast ---------- */

  var toast = document.querySelector("[data-toast]");
  var toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  /* ---------- Bag (local interface state only) ---------- */

  var bagButton = document.querySelector("[data-bag]");
  var bagCount = document.querySelector("[data-bag-count]");
  var items = 0;

  function renderBag() {
    if (bagCount) bagCount.textContent = String(items);
    if (bagButton) {
      bagButton.setAttribute("aria-label", "Bag, " + items + (items === 1 ? " item" : " items"));
    }
  }

  document.querySelectorAll("[data-add]").forEach(function (button) {
    button.addEventListener("click", function () {
      items += 1;
      renderBag();

      if (bagCount && window.gsap && !reduceMotion.matches) {
        window.gsap.fromTo(
          bagCount,
          { scale: 1 },
          { scale: 1.25, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" }
        );
      }

      showToast(button.getAttribute("data-add") + " added. This bag is a demonstration.");
    });
  });

  if (bagButton) {
    bagButton.addEventListener("click", function () {
      showToast(items === 0
        ? "This bag is a demonstration. No checkout is connected."
        : items + " in the bag. This is a demonstration, so there is no checkout.");
    });
  }

  renderBag();

  /* ---------- Newsletter (no backend) ---------- */

  var form = document.querySelector("[data-newsletter]");
  var status = document.querySelector("[data-form-status]");
  var email = document.querySelector("#email");

  if (form && status) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!email || !email.value.trim() || !email.checkValidity()) {
        status.textContent = "Enter an email address first.";
        if (email) email.focus();
        return;
      }
      status.textContent = "Demo only — no list is connected.";
      form.reset();
    });
  }

  /* ---------- Motion ---------- */

  if (!window.gsap) return;

  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  var mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", function () {
    if (!window.ScrollTrigger) return;

    document.querySelectorAll("[data-reveal]").forEach(function (group) {
      var items = group.querySelectorAll("[data-reveal-item]");
      var targets = items.length ? Array.prototype.slice.call(items) : [group];

      gsap.from(targets, {
        y: function (index, element) {
          if (element.tagName === "IMG") return 0;
          return element.getAttribute("data-reveal-item") === "heading" ? 20 : 16;
        },
        scale: function (index, element) {
          return element.tagName === "IMG" ? 1.03 : 1;
        },
        opacity: 0,
        duration: function (index, element) {
          if (element.tagName === "IMG") return 0.7;
          return element.getAttribute("data-reveal-item") === "heading" ? 0.48 : 0.42;
        },
        ease: "power2.out",
        stagger: 0.06,
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: group,
          start: "top 85%",
          once: true
        }
      });
    });
  });

  mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", function () {
    if (!window.ScrollTrigger) return;

    var band = document.querySelector("[data-band]");
    var image = document.querySelector("[data-band-img]");
    if (!band || !image) return;

    gsap.fromTo(
      image,
      { scale: 1.06 },
      {
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: band,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      }
    );
  });
})();
