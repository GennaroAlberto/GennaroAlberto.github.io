/* =========================================================
   Site background: particles.js, coloured by the order flow.
   Each market order in the order-book simulation (orderflow.js)
   fades in a particle in its side's colour and retires the oldest
   one, so the field drifts blue during buying bursts and gold
   during selling bursts.
   ========================================================= */
(function () {
  "use strict";

  var host = document.getElementById("bg-particles");
  if (!host || typeof window.particlesJS !== "function") return;

  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var OPACITY = 0.55;

  function tokens() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fb) { var x = cs.getPropertyValue(name).trim(); return /^#[0-9a-f]{3,6}$/i.test(x) ? x : fb; }
    return { buy: v("--buy", "#2657ff"), sell: v("--sell", "#b47b12"), line: v("--muted", "#5b6472") };
  }

  function rgb(hex) {
    hex = hex.replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, "#$1$1$2$2$3$3");
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 128, g: 128, b: 128 };
  }

  var T = tokens();

  window.particlesJS("bg-particles", {
    particles: {
      number: { value: 70, density: { enable: true, value_area: 1000 } },
      color: { value: [T.buy, T.sell] },
      shape: { type: "circle" },
      opacity: { value: OPACITY, random: false, anim: { enable: false } },
      size: { value: 2.6, random: true, anim: { enable: false } },
      // color_rgb_line is passed up front: particles.js only derives it after its first draw,
      // which throws when motion is off (reduced-motion visitors).
      line_linked: { enable: true, distance: 140, color: T.line, color_rgb_line: rgb(T.line), opacity: 0.22, width: 1 },
      move: { enable: !reduce, speed: 0.7, direction: "none", random: false, straight: false, out_mode: "out", bounce: false }
    },
    interactivity: {
      detect_on: "window",
      events: {
        onhover: { enable: !reduce, mode: "grab" },
        onclick: { enable: false },
        resize: true
      },
      modes: { grab: { distance: 170, line_linked: { opacity: 0.45 } } }
    },
    retina_detect: true
  });

  var inst = window.pJSDom && window.pJSDom[window.pJSDom.length - 1];
  if (!inst) return;
  var pJS = inst.pJS;

  // Give every particle a side so its colour can follow the theme and the flow.
  function paint(p) { p.color = { rgb: rgb(p._side > 0 ? T.buy : T.sell) }; }
  pJS.particles.array.forEach(function (p) { p._side = Math.random() < 0.5 ? 1 : -1; paint(p); });

  var fading = [], raf = 0, lastSpawn = 0;

  function step() {
    raf = 0;
    for (var i = fading.length - 1; i >= 0; i--) {
      var p = fading[i];
      if (p._dying) {
        p.opacity -= 0.02;
        if (p.opacity <= 0) {
          var k = pJS.particles.array.indexOf(p);
          if (k >= 0) pJS.particles.array.splice(k, 1);
          fading.splice(i, 1);
        }
      } else {
        p.opacity += 0.03;
        if (p.opacity >= OPACITY) { p.opacity = OPACITY; fading.splice(i, 1); }
      }
    }
    if (fading.length) raf = requestAnimationFrame(step);
  }

  document.addEventListener("orderflow:fill", function (e) {
    if (reduce || document.hidden) return;
    var now = performance.now();
    if (now - lastSpawn < 90) return;            // cap the spawn rate in big bursts
    lastSpawn = now;

    pJS.fn.modes.pushParticles(1);
    var fresh = pJS.particles.array[pJS.particles.array.length - 1];
    fresh._side = e.detail && e.detail.side > 0 ? 1 : -1;
    paint(fresh);
    fresh.opacity = 0;
    fading.push(fresh);

    // Retire the oldest settled particle so the count stays put.
    for (var j = 0; j < pJS.particles.array.length; j++) {
      var q = pJS.particles.array[j];
      if (!q._dying && fading.indexOf(q) < 0) { q._dying = true; fading.push(q); break; }
    }
    if (!raf) raf = requestAnimationFrame(step);
  });

  // Follow the light/dark toggle without restarting the animation.
  new MutationObserver(function () {
    T = tokens();
    pJS.particles.line_linked.color_rgb_line = rgb(T.line);
    pJS.particles.array.forEach(paint);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
