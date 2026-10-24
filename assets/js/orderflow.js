/* =========================================================
   Self-exciting order flow
   A limit order book whose six order types (market, limit and cancel,
   on each side) arrive as a multivariate Hawkes process with
   exponential kernels,

     λ_i(t) = μ_i + Σ_j α_ij Σ_{t_k^j < t} exp(−β (t − t_k^j)),

   simulated exactly by Ogata thinning. Renders a price ladder, a
   trade / mid-price chart, an intensity chart, and a quiet strip of
   the same process at the bottom of the hero.
   ========================================================= */
(function () {
  "use strict";

  // ---------- Model ----------
  var D = 6, MB = 0, MS = 1, LB = 2, LS = 3, CB = 4, CS = 5;

  // Baseline rates μ (orders per second).
  var MU = [0.5, 0.5, 1.6, 1.6, 1.0, 1.0];

  // Shape of the excitation: G0[i][j] is how strongly a type-j order raises
  // the arrival rate of type i. The matrix is rescaled so that its spectral
  // radius equals the chosen branching ratio n.
  //            MB    MS    LB    LS    CB    CS
  var G0 = [
    /* MB */ [0.30, 0.04, 0.00, 0.04, 0.00, 0.04], // buys herd
    /* MS */ [0.04, 0.30, 0.04, 0.00, 0.04, 0.00], // sells herd
    /* LB */ [0.10, 0.30, 0.25, 0.00, 0.10, 0.00], // bids refill after sells
    /* LS */ [0.30, 0.10, 0.00, 0.25, 0.00, 0.10], // asks refill after buys
    /* CB */ [0.00, 0.12, 0.20, 0.00, 0.15, 0.00], // bid makers pull after sells
    /* CS */ [0.12, 0.00, 0.00, 0.20, 0.00, 0.15]  // ask makers pull after buys
  ];

  function spectralRadius(M) {
    // Power iteration; M is non-negative and irreducible.
    var m = M.length, v = [], i, j, k, w, s = 0;
    for (i = 0; i < m; i++) v.push(1 / m);
    for (k = 0; k < 400; k++) {
      w = []; s = 0;
      for (i = 0; i < m; i++) {
        var a = 0;
        for (j = 0; j < m; j++) a += M[i][j] * v[j];
        w.push(a); s += a;
      }
      if (s <= 0) return 0;
      for (i = 0; i < m; i++) v[i] = w[i] / s;
    }
    return s;
  }

  function solve(A, b) {
    // Gaussian elimination with partial pivoting.
    var m = b.length, M = [], i, j, k;
    for (i = 0; i < m; i++) M.push(A[i].slice().concat([b[i]]));
    for (k = 0; k < m; k++) {
      var p = k;
      for (i = k + 1; i < m; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
      var tmp = M[k]; M[k] = M[p]; M[p] = tmp;
      for (i = k + 1; i < m; i++) {
        var f = M[i][k] / M[k][k];
        for (j = k; j <= m; j++) M[i][j] -= f * M[k][j];
      }
    }
    var x = new Array(m);
    for (i = m - 1; i >= 0; i--) {
      var s = M[i][m];
      for (j = i + 1; j < m; j++) s -= M[i][j] * x[j];
      x[i] = s / M[i][i];
    }
    return x;
  }

  function lowerBound(arr, x) {
    var lo = 0, hi = arr.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (arr[mid] < x) lo = mid + 1; else hi = mid; }
    return lo;
  }

  function exp1() { return -Math.log(1 - Math.random()); }
  function geom(p) { return Math.floor(Math.log(1 - Math.random()) / Math.log(1 - p)); }

  function createEngine(opts) {
    var cfg = { mo: 3, lim: 4, place: 0.45, improve: 0.6, cLo: 0.15, cHi: 0.35 };
    if (opts) for (var key in opts) cfg[key] = opts[key];
    var RHO0 = spectralRadius(G0);
    var K = 40;                      // price levels tracked on each side
    var KEEP = 65, KEEP_BOOK = 35, RATE_WIN = 60;

    var n = 0.75, half = 0.7, beta = Math.LN2 / half;
    var G = [], alpha = [];
    var R = new Float64Array(D);     // R_j(t) = Σ_k exp(−β (t − t_k^j))
    var lam = new Float64Array(D);
    var t = 0, lastTrim = 0;

    // Book, stored relative to the touch: asks[k] is the depth k ticks above the
    // best ask, bids[k] the depth k ticks below the best bid.
    var asks = new Float64Array(K), bids = new Float64Array(K);
    var bestBid = 10000, bestAsk = 10001;   // in ticks of 0.01

    var H = { t: [], b: [], s: [] };        // λ_MB and λ_MS samples
    var B = { t: [], bid: [], ask: [] };    // best quotes
    var trades = [];                        // {t, px, size, side}
    var marks = [];                         // {t, side} market-order arrivals
    var arrivals = [];                      // all endogenous arrivals (rate estimate)

    var eng = { onFill: null };

    function rebuild() {
      var c = n / RHO0;
      G = G0.map(function (row) { return row.map(function (g) { return g * c; }); });
      alpha = G.map(function (row) { return row.map(function (g) { return g * beta; }); });
    }

    function intensities() {
      var tot = 0;
      for (var i = 0; i < D; i++) {
        var a = MU[i], row = alpha[i];
        for (var j = 0; j < D; j++) a += row[j] * R[j];
        lam[i] = a; tot += a;
      }
      return tot;
    }

    function decay(dt) {
      if (dt <= 0) return;
      var f = Math.exp(-beta * dt);
      for (var j = 0; j < D; j++) R[j] *= f;
    }

    function sample() { intensities(); H.t.push(t); H.b.push(lam[MB]); H.s.push(lam[MS]); }
    function quote() { B.t.push(t); B.bid.push(bestBid); B.ask.push(bestAsk); }

    // ---- book mechanics ----
    function depthAt(k) {
      var base = 5 + 1.3 * Math.min(k, 14);
      return Math.max(1, Math.round(base * (0.55 + 0.9 * Math.random())));
    }
    function shiftOut(q) { for (var k = 0; k < K - 1; k++) q[k] = q[k + 1]; q[K - 1] = depthAt(K - 1); }
    function shiftIn(q) { for (var k = K - 1; k > 0; k--) q[k] = q[k - 1]; q[0] = 0; }

    function clearTouch(side) {
      // side > 0: the ask touch emptied; side < 0: the bid touch emptied.
      var q = side > 0 ? asks : bids;
      while (q[0] <= 0) {
        q[0] = 0; shiftOut(q);
        if (side > 0) bestAsk++; else bestBid--;
      }
    }

    function marketOrder(side, size) {
      // side > 0 lifts the asks, side < 0 hits the bids.
      var q = side > 0 ? asks : bids, rem = size, notional = 0, filled = 0, levels = 0;
      while (rem > 0) {
        var px = side > 0 ? bestAsk : bestBid;
        var take = Math.min(q[0], rem);
        q[0] -= take; rem -= take; notional += take * px; filled += take; levels++;
        if (q[0] <= 0) clearTouch(side);
      }
      var tr = { t: t, px: notional / filled, size: filled, side: side };
      trades.push(tr);
      marks.push({ t: t, side: side });
      if (eng.onFill) eng.onFill(side, levels);
      return tr;
    }

    function limitOrder(side, size) {
      // side > 0 joins the bids, side < 0 the asks.
      var q = side > 0 ? bids : asks, spread = bestAsk - bestBid;
      if (spread > 1 && Math.random() < Math.min(0.9, cfg.improve * (spread - 1))) {
        shiftIn(q); q[0] = size;                 // improve the quote inside the spread
        if (side > 0) bestBid++; else bestAsk--;
      } else {
        q[Math.min(K - 1, geom(cfg.place))] += size;
      }
    }

    function cancel(side) {
      var q = side > 0 ? bids : asks, tot = 0, k;
      for (k = 0; k < 12; k++) tot += q[k];
      if (tot <= 0) return;
      var u = Math.random() * tot;
      for (k = 0; k < 11 && u > q[k]; k++) u -= q[k];
      var amt = Math.max(1, Math.round(q[k] * (cfg.cLo + cfg.cHi * Math.random())));
      q[k] = Math.max(0, q[k] - amt);
      if (k === 0 && q[0] <= 0) clearTouch(side > 0 ? -1 : 1);
    }

    function fire(i) {
      var bb = bestBid, ba = bestAsk;
      H.t.push(t); H.b.push(lam[MB]); H.s.push(lam[MS]);       // λ just before
      switch (i) {
        case MB: marketOrder(1, 1 + Math.floor(exp1() * cfg.mo)); break;
        case MS: marketOrder(-1, 1 + Math.floor(exp1() * cfg.mo)); break;
        case LB: limitOrder(1, 1 + Math.floor(exp1() * cfg.lim)); break;
        case LS: limitOrder(-1, 1 + Math.floor(exp1() * cfg.lim)); break;
        case CB: cancel(1); break;
        case CS: cancel(-1); break;
      }
      R[i] += 1;
      arrivals.push(t);
      sample();                                                 // λ just after
      if (bb !== bestBid || ba !== bestAsk) quote();
    }

    function trimBy(tmin, tArr, others) {
      var k = lowerBound(tArr, tmin);
      if (k > 0) {
        tArr.splice(0, k);
        for (var i = 0; i < others.length; i++) others[i].splice(0, k);
      }
    }
    function trimObjs(arr, tmin) {
      var k = 0;
      while (k < arr.length && arr[k].t < tmin) k++;
      if (k > 0) arr.splice(0, k);
    }
    function trim() {
      lastTrim = t;
      trimBy(t - KEEP, H.t, [H.b, H.s]);
      // keep one quote before the window so the band starts at the left edge
      var kb = lowerBound(B.t, t - KEEP_BOOK) - 1;
      if (kb > 0) { B.t.splice(0, kb); B.bid.splice(0, kb); B.ask.splice(0, kb); }
      trimObjs(trades, t - KEEP_BOOK);
      trimObjs(marks, t - KEEP);
      var ka = lowerBound(arrivals, t - RATE_WIN);
      if (ka > 0) arrivals.splice(0, ka);
    }

    // ---- public API ----
    eng.advance = function (dt) {
      var tEnd = t + dt, guard = 0;
      while (guard++ < 5000) {
        var bound = intensities();                 // λ only decays until the next event
        var w = exp1() / bound;
        if (t + w >= tEnd) break;
        decay(w); t += w;
        var tot = intensities();
        if (Math.random() * bound <= tot) {
          var u = Math.random() * tot, i = 0;
          while (i < D - 1 && u > lam[i]) { u -= lam[i]; i++; }
          fire(i);
        }
      }
      decay(tEnd - t); t = tEnd;
      sample(); quote();
      if (t - lastTrim > 0.5) trim();
    };

    eng.sweep = function (side) {
      // One large market order that clears the first four price levels.
      var q = side > 0 ? asks : bids, size = 0, i = side > 0 ? MB : MS;
      for (var k = 0; k < 4; k++) size += q[k];
      intensities();
      H.t.push(t); H.b.push(lam[MB]); H.s.push(lam[MS]);
      marketOrder(side, Math.max(1, Math.round(size)));
      R[i] += 3;                                   // a sweep excites like a short burst
      sample(); quote();
    };

    eng.setBranching = function (v) { n = Math.max(0, Math.min(0.99, v)); rebuild(); };
    eng.setHalfLife = function (h) { half = Math.max(0.05, h); beta = Math.LN2 / half; rebuild(); };
    eng.branching = function () { return n; };
    eng.halfLife = function () { return half; };

    eng.theory = function () {
      // Stationary rate 1ᵀ (I − G)⁻¹ μ, with G = α / β.
      var I = [];
      for (var i = 0; i < D; i++) {
        var row = [];
        for (var j = 0; j < D; j++) row.push((i === j ? 1 : 0) - G[i][j]);
        I.push(row);
      }
      var x = solve(I, MU), s = 0;
      for (var k = 0; k < D; k++) s += x[k];
      return s;
    };

    eng.observed = function () {
      var span = Math.min(RATE_WIN, t);
      if (span < 3) return NaN;
      return (arrivals.length - lowerBound(arrivals, t - span)) / span;
    };

    eng.time = function () { return t; };
    eng.book = function () { return { bestBid: bestBid, bestAsk: bestAsk, asks: asks, bids: bids }; };
    eng.H = H; eng.B = B; eng.trades = trades; eng.marks = marks; eng.MU = MU;

    for (var k = 0; k < K; k++) { asks[k] = depthAt(k); bids[k] = depthAt(k); }
    rebuild(); sample(); quote();
    return eng;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createEngine: createEngine, G0: G0, MU: MU, spectralRadius: spectralRadius };
    return;
  }
  if (typeof document === "undefined") return;

  // =========================================================
  //  Browser
  // =========================================================
  var panel = document.querySelector('[data-flow="panel"]');
  var strip = document.querySelector('[data-flow="hero"]');
  if (!panel && !strip) return;

  var eng = createEngine();
  var WIN = 30, HERO_WIN = 60, LEVELS = 8, TICK = 0.01;
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var paused = reduce;
  var C = {};
  var FONT = "11px Inter, ui-sans-serif, system-ui, -apple-system, sans-serif";

  // Warm up so the charts open full.
  for (var w = 0; w < HERO_WIN + 5; w += 1 / 30) eng.advance(1 / 30);

  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fb) { var x = cs.getPropertyValue(name).trim(); return x || fb; }
    C.buy = v("--buy", "#2657ff"); C.sell = v("--sell", "#b47b12");
    C.fg = v("--fg", "#0f172a"); C.soft = v("--fg-soft", "#1f2937");
    C.muted = v("--muted", "#5b6472"); C.line = v("--line", "#e6e8ee");
    C.card = v("--card", "#ffffff");
  }
  readTheme();

  function setupCanvas(cv) {
    var o = { cv: cv, ctx: cv.getContext("2d"), w: 0, h: 0 };
    o.fit = function () {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      o.w = Math.max(1, r.width); o.h = Math.max(1, r.height);
      cv.width = Math.round(o.w * dpr); cv.height = Math.round(o.h * dpr);
      o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    o.fit();
    return o;
  }

  function niceStep(span, target) {
    var raw = span / target, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  function smooth(o, key, target, rate) {
    if (o[key] == null || !isFinite(o[key])) o[key] = target;
    else o[key] += (target - o[key]) * rate;
    return o[key];
  }

  function valueAt(tArr, vArr, tq) {
    var i = lowerBound(tArr, tq);
    if (i >= tArr.length) i = tArr.length - 1;
    if (i > 0 && tArr[i] > tq) i--;
    return vArr[i];
  }

  function stepPath(ctx, tArr, vArr, i0, X, Y, xEnd) {
    var first = true, prev = 0;
    for (var i = i0; i < tArr.length; i++) {
      var x = X(tArr[i]), y = Y(vArr[i]);
      if (first) { ctx.moveTo(x, y); first = false; }
      else { ctx.lineTo(x, prev); ctx.lineTo(x, y); }
      prev = y;
    }
    if (!first && xEnd != null) ctx.lineTo(xEnd, prev);
  }

  function linePath(ctx, tArr, vArr, i0, X, Y) {
    for (var i = i0; i < tArr.length; i++) {
      var x = X(tArr[i]), y = Y(vArr[i]);
      if (i === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }

  function dot(ctx, x, y, r, fill) {
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 6.2832); ctx.fillStyle = C.card; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = fill; ctx.fill();
  }

  // ---------- Price ladders (section and hero card) ----------
  // Rows are anchored to the touch: asks k = levels−1..0, spread, bids k = 0..levels−1.
  function makeLadder(host, levels, spreadText) {
    var L = { rows: { ask: [], bid: [] }, levels: levels, sq: {}, spreadText: spreadText }, k;
    function makeRow(side, k) {
      var el = document.createElement("div");
      el.className = "lob-row " + side;
      el.setAttribute("data-k", k);
      el.innerHTML = '<span class="lob-bar"></span><span class="lob-flash"></span><span class="lob-px"></span><span class="lob-qty"></span>';
      return { el: el, bar: el.children[0], flash: el.children[1], px: el.children[2], qty: el.children[3], lp: null, lq: null, lw: null };
    }
    for (k = levels - 1; k >= 0; k--) { L.rows.ask[k] = makeRow("ask", k); host.appendChild(L.rows.ask[k].el); }
    L.spread = document.createElement("div");
    L.spread.className = "lob-spread";
    host.appendChild(L.spread);
    for (k = 0; k < levels; k++) { L.rows.bid[k] = makeRow("bid", k); host.appendChild(L.rows.bid[k].el); }
    return L;
  }

  function updateLadder(L) {
    var b = eng.book(), k, top = 0;
    for (k = 0; k < L.levels; k++) { if (b.asks[k] > top) top = b.asks[k]; if (b.bids[k] > top) top = b.bids[k]; }
    var qmax = smooth(L.sq, "max", Math.max(20, top * 1.1), 0.05);
    function upd(row, px, q) {
      if (row.lp !== px) { row.px.textContent = (px * TICK).toFixed(2); row.lp = px; }
      var qi = Math.round(q);
      if (row.lq !== qi) { row.qty.textContent = qi > 0 ? String(qi) : ""; row.lq = qi; }
      var bw = Math.min(100, qi / qmax * 100).toFixed(1);
      if (row.lw !== bw) { row.bar.style.width = bw + "%"; row.lw = bw; }
    }
    for (k = 0; k < L.levels; k++) {
      upd(L.rows.ask[k], b.bestAsk + k, b.asks[k]);
      upd(L.rows.bid[k], b.bestBid - k, b.bids[k]);
    }
    var sp = L.spreadText(b);
    if (L.spread.textContent !== sp) L.spread.textContent = sp;
  }

  function flashLadder(L, side) {
    var row = side > 0 ? L.rows.ask[0] : L.rows.bid[0];
    if (row.flash.animate) row.flash.animate([{ opacity: 0.32 }, { opacity: 0 }], { duration: 360, easing: "ease-out" });
  }

  // ---------- Panel ----------
  var P = null;
  if (panel) {
    P = {
      price: setupCanvas(panel.querySelector(".flow-price")),
      lambda: setupCanvas(panel.querySelector(".flow-lambda")),
      plot: panel.querySelector(".flow-plot"),
      tip: panel.querySelector(".flow-tip"),
      ladder: panel.querySelector(".lob"),
      nIn: panel.querySelector("#flow-n"), nOut: panel.querySelector("#flow-n-out"),
      hIn: panel.querySelector("#flow-h"), hOut: panel.querySelector("#flow-h-out"),
      obs: panel.querySelector('[data-out="obs"]'), theory: panel.querySelector('[data-out="theory"]'),
      pauseBtn: panel.querySelector('[data-act="pause"]'),
      hoverX: null, visible: true, lastFoot: 0,
      sp: {}, sl: {}, sq: {}
    };
    var M = { l: 6, r: 52, t: 10 };

    P.book = makeLadder(P.ladder, LEVELS, function (b) {
      return "Spread " + ((b.bestAsk - b.bestBid) * TICK).toFixed(2) + "   Mid " + ((b.bestAsk + b.bestBid) / 2 * TICK).toFixed(3);
    });

    // Tooltip
    P.tip.innerHTML =
      '<div class="tip-time"></div>' +
      '<div class="tip-row"><i class="key key-buy"></i><b></b><span>buy orders / s</span></div>' +
      '<div class="tip-row"><i class="key key-sell"></i><b></b><span>sell orders / s</span></div>' +
      '<div class="tip-row"><i class="key key-mid"></i><b></b><span>mid price</span></div>';
    P.tipTime = P.tip.children[0];
    P.tipB = P.tip.children[1].children[1];
    P.tipS = P.tip.children[2].children[1];
    P.tipM = P.tip.children[3].children[1];

    P.plot.addEventListener("pointermove", function (e) {
      var r = P.plot.getBoundingClientRect();
      P.hoverX = e.clientX - r.left;
      if (P.hoverX < M.l || P.hoverX > r.width - M.r) P.hoverX = null;
      if (paused) render();
    });
    P.plot.addEventListener("pointerleave", function () { P.hoverX = null; P.tip.hidden = true; if (paused) render(); });

    P.nIn.addEventListener("input", function () { eng.setBranching(+P.nIn.value); updateParams(); });
    P.hIn.addEventListener("input", function () { eng.setHalfLife(+P.hIn.value); updateParams(); });
    panel.querySelector('[data-act="buy"]').addEventListener("click", function () { eng.sweep(1); if (paused) render(); });
    panel.querySelector('[data-act="sell"]').addEventListener("click", function () { eng.sweep(-1); if (paused) render(); });
    P.pauseBtn.addEventListener("click", function () { setPaused(!paused); });

    eng.setBranching(+P.nIn.value);
    eng.setHalfLife(+P.hIn.value);
  }

  function updateParams() {
    if (!P) return;
    P.nOut.textContent = eng.branching().toFixed(2);
    P.hOut.textContent = eng.halfLife().toFixed(2) + " s";
    P.theory.textContent = eng.theory().toFixed(1) + " / s";
  }

  function setPaused(p) {
    paused = p;
    if (P) {
      P.pauseBtn.textContent = paused ? "Play" : "Pause";
      P.pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
    }
    if (!paused) kick(); else render();
  }

  function drawPrice() {
    var o = P.price, ctx = o.ctx, w = o.w, h = o.h, now = eng.time(), Bq = eng.B;
    var x0 = M.l, x1 = w - M.r, y0 = M.t, y1 = h - 8, t0 = now - WIN;
    ctx.clearRect(0, 0, w, h);
    function X(t) { return x0 + (t - t0) / WIN * (x1 - x0); }

    var i0 = Math.max(0, lowerBound(Bq.t, t0) - 1), lo = Infinity, hi = -Infinity, i;
    for (i = i0; i < Bq.t.length; i++) {
      if (Bq.bid[i] < lo) lo = Bq.bid[i];
      if (Bq.ask[i] > hi) hi = Bq.ask[i];
    }
    var mid = (lo + hi) / 2, span = Math.max(12, (hi - lo) * 1.3);
    var ylo = smooth(P.sp, "lo", mid - span / 2, 0.08), yhi = smooth(P.sp, "hi", mid + span / 2, 0.08);
    function Y(p) { return y1 - (p - ylo) / (yhi - ylo) * (y1 - y0); }

    // grid
    var step = Math.max(1, niceStep(yhi - ylo, 4)), g;
    ctx.font = FONT; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    ctx.lineWidth = 1;
    for (g = Math.ceil(ylo / step) * step; g <= yhi; g += step) {
      var gy = Math.round(Y(g)) + 0.5;
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText((g * TICK).toFixed(2), x1 + 8, gy);
    }

    // bid–ask band
    ctx.beginPath();
    stepPath(ctx, Bq.t, Bq.ask, i0, X, Y, null);
    for (i = Bq.t.length - 1; i >= i0; i--) {
      var xb = X(Bq.t[i]);
      ctx.lineTo(xb, Y(Bq.bid[i]));
      if (i > i0) ctx.lineTo(xb, Y(Bq.bid[i - 1]));
    }
    ctx.closePath();
    ctx.globalAlpha = 0.1; ctx.fillStyle = C.fg; ctx.fill(); ctx.globalAlpha = 1;

    // mid
    var midT = [], midV = [];
    for (i = i0; i < Bq.t.length; i++) { midT.push(Bq.t[i]); midV.push((Bq.bid[i] + Bq.ask[i]) / 2); }
    ctx.beginPath(); stepPath(ctx, midT, midV, 0, X, Y, null);
    ctx.strokeStyle = C.soft; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();

    // trades
    var tr = eng.trades;
    for (i = 0; i < tr.length; i++) {
      var d = tr[i];
      if (d.t < t0) continue;
      dot(ctx, X(d.t), Y(d.px), Math.min(7, 1.6 + 0.75 * Math.sqrt(d.size)), d.side > 0 ? C.buy : C.sell);
    }

    // end-dot on the mid
    if (midV.length) dot(ctx, x1, Y(midV[midV.length - 1]), 4, C.soft);

    if (P.hoverX != null) {
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(P.hoverX) + 0.5, y0); ctx.lineTo(Math.round(P.hoverX) + 0.5, y1); ctx.stroke();
    }
  }

  function drawLambda() {
    var o = P.lambda, ctx = o.ctx, w = o.w, h = o.h, now = eng.time(), H = eng.H;
    var x0 = M.l, x1 = w - M.r, y0 = 8, y1 = h - 40, t0 = now - WIN, i;
    ctx.clearRect(0, 0, w, h);
    function X(t) { return x0 + (t - t0) / WIN * (x1 - x0); }

    var i0 = Math.max(0, lowerBound(H.t, t0) - 1), top = 0;
    for (i = i0; i < H.t.length; i++) { if (H.b[i] > top) top = H.b[i]; if (H.s[i] > top) top = H.s[i]; }
    var ymax = smooth(P.sl, "max", Math.max(2, top * 1.15), 0.06);
    function Y(v) { return y1 - v / ymax * (y1 - y0); }

    // grid
    var step = niceStep(ymax, 3), g;
    ctx.font = FONT; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.lineWidth = 1;
    for (g = 0; g <= ymax + 1e-9; g += step) {
      var gy = Math.round(Y(g)) + 0.5;
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText(g === 0 ? "0" : (step < 1 ? g.toFixed(1) : String(Math.round(g))) + " / s", x1 + 8, gy);
    }

    // baseline μ
    var my = Math.round(Y(eng.MU[MB])) + 0.5;
    ctx.strokeStyle = C.muted; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.moveTo(x0, my); ctx.lineTo(x1, my); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = C.muted; ctx.font = "italic 13px Newsreader, Georgia, serif"; ctx.textBaseline = "bottom";
    ctx.fillText("μ", x0 + 4, my - 2);
    ctx.font = FONT; ctx.textBaseline = "middle";

    // intensities
    ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); linePath(ctx, H.t, H.s, i0, X, Y); ctx.strokeStyle = C.sell; ctx.stroke();
    ctx.beginPath(); linePath(ctx, H.t, H.b, i0, X, Y); ctx.strokeStyle = C.buy; ctx.stroke();

    // arrivals raster
    var rb = h - 34, mk = eng.marks;
    for (i = 0; i < mk.length; i++) {
      if (mk[i].t < t0) continue;
      var xm = Math.round(X(mk[i].t));
      ctx.fillStyle = mk[i].side > 0 ? C.buy : C.sell;
      ctx.fillRect(xm - 1, mk[i].side > 0 ? rb : rb + 8, 2, 6);
    }

    // time axis
    ctx.fillStyle = C.muted; ctx.textBaseline = "alphabetic";
    var ty = h - 4;
    [30, 20, 10, 0].forEach(function (s) {
      var x = X(now - s);
      ctx.textAlign = s === 30 ? "left" : s === 0 ? "right" : "center";
      ctx.fillText(s === 0 ? "now" : "−" + s + " s", s === 0 ? x1 : x, ty);
    });

    // crosshair + tooltip
    if (P.hoverX != null) {
      var hx = P.hoverX, tq = t0 + (hx - x0) / (x1 - x0) * WIN;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(hx) + 0.5, y0); ctx.lineTo(Math.round(hx) + 0.5, y1); ctx.stroke();
      var vb = valueAt(H.t, H.b, tq), vs = valueAt(H.t, H.s, tq);
      dot(ctx, hx, Y(vs), 4, C.sell);
      dot(ctx, hx, Y(vb), 4, C.buy);
      var Bq = eng.B, bid = valueAt(Bq.t, Bq.bid, tq), ask = valueAt(Bq.t, Bq.ask, tq);
      var ago = now - tq;
      P.tipTime.textContent = ago < 0.05 ? "now" : ago.toFixed(1) + " s ago";
      P.tipB.textContent = vb.toFixed(2);
      P.tipS.textContent = vs.toFixed(2);
      P.tipM.textContent = ((bid + ask) / 2 * TICK).toFixed(3);
      P.tip.hidden = false;
      var tw = P.tip.offsetWidth, pw = P.plot.clientWidth;
      P.tip.style.left = (hx + 14 + tw > pw ? hx - 14 - tw : hx + 14) + "px";
    }
  }

  // ---------- Hero strip ----------
  var S = null;
  if (strip) S = { c: setupCanvas(strip), visible: true, s: {} };

  // Compact book card beside the portrait: three levels a side and the last trade.
  var heroBook = document.querySelector('[data-flow="hero-book"]');
  if (S && heroBook) {
    S.book = makeLadder(heroBook.querySelector(".lob"), 3, function (b) {
      return "Spread " + ((b.bestAsk - b.bestBid) * TICK).toFixed(2);
    });
    S.last = heroBook.querySelector(".hb-last");
    S.tri = heroBook.querySelector(".hb-tri");
  }

  function updateHeroBook() {
    updateLadder(S.book);
    var tr = eng.trades;
    if (!tr.length) return;
    var d = tr[tr.length - 1], txt = (d.px * TICK).toFixed(2), cls = "hb-tri " + (d.side > 0 ? "up" : "down");
    if (S.lastTxt !== txt) { S.last.textContent = txt; S.lastTxt = txt; }
    if (S.tri.className !== cls) S.tri.className = cls;
  }

  eng.onFill = function (side, levels) {
    if (window.CustomEvent) document.dispatchEvent(new CustomEvent("orderflow:fill", { detail: { side: side, levels: levels } }));
    if (P && P.visible) flashLadder(P.book, side);
    if (S && S.book && S.visible) flashLadder(S.book, side);
  };

  function drawHero() {
    var o = S.c, ctx = o.ctx, w = o.w, h = o.h, now = eng.time(), H = eng.H, i;
    var t0 = now - HERO_WIN, y0 = h * 0.12, y1 = h * 0.88;
    ctx.clearRect(0, 0, w, h);
    function X(t) { return (t - t0) / HERO_WIN * w; }
    var i0 = Math.max(0, lowerBound(H.t, t0) - 1), top = 0;
    for (i = i0; i < H.t.length; i++) { if (H.b[i] > top) top = H.b[i]; if (H.s[i] > top) top = H.s[i]; }
    var ymax = smooth(S.s, "max", Math.max(2, top * 1.1), 0.04);
    function Y(v) { return y1 - v / ymax * (y1 - y0); }
    ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.globalAlpha = 0.85;
    ctx.beginPath(); linePath(ctx, H.t, H.s, i0, X, Y); ctx.strokeStyle = C.sell; ctx.stroke();
    ctx.beginPath(); linePath(ctx, H.t, H.b, i0, X, Y); ctx.strokeStyle = C.buy; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ---------- Loop ----------
  var raf = 0, last = null;
  function shouldRun() {
    return !paused && !document.hidden && ((P && P.visible) || (S && S.visible));
  }
  function render() {
    if (P && P.visible) {
      drawPrice(); drawLambda(); updateLadder(P.book);
      if (P.hoverX == null) P.tip.hidden = true;
      var now = eng.time();
      if (now - P.lastFoot > 0.25 || paused) {
        P.lastFoot = now;
        var ob = eng.observed();
        P.obs.textContent = isFinite(ob) ? ob.toFixed(1) + " / s" : "—";
      }
    }
    if (S && S.visible) { drawHero(); if (S.book) updateHeroBook(); }
  }
  function frame(ts) {
    raf = 0;
    if (!shouldRun()) { last = null; return; }
    var dt = last == null ? 0 : Math.min(0.1, (ts - last) / 1000);
    last = ts;
    if (dt > 0) eng.advance(dt);
    render();
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && shouldRun()) raf = requestAnimationFrame(frame); }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (P && en.target === panel) P.visible = en.isIntersecting;
        if (S && en.target === strip) S.visible = en.isIntersecting;
      });
      render(); kick();
    }, { rootMargin: "80px" });
    if (panel) io.observe(panel);
    if (strip) io.observe(strip);
  }
  document.addEventListener("visibilitychange", function () { last = null; kick(); });

  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function () {
      if (P) { P.price.fit(); P.lambda.fit(); }
      if (S) S.c.fit();
      render();
    });
    if (P) { ro.observe(P.price.cv); ro.observe(P.lambda.cv); }
    if (S) ro.observe(S.c.cv);
  }

  new MutationObserver(function () { readTheme(); render(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  updateParams();
  setPaused(paused);
  render();
  kick();
})();
