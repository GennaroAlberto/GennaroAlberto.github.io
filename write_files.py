import os, shutil, zipfile, textwrap, pathlib

base = os.getcwd() + "/data"
if os.path.exists(base):
    shutil.rmtree(base)
os.makedirs(base, exist_ok=True)

def write(relpath, content):
    path = os.path.join(base, relpath)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

# Files content
config_yml = """title: Alberto Gennaro
description: Stochastic Control · OR · ML
theme: null
markdown: kramdown
permalink: pretty
"""

default_html = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>{% if page.title %}{{ page.title }} · {% endif %}{{ site.title }}</title>
    <meta name="description" content="{{ site.description }}" />
    <link rel="stylesheet" href="{{ '/assets/css/main.css' | relative_url }}" />
  </head>
  <body>
    <div class="container">
      {% include nav.html %}
      <main>{{ content }}</main>
      <footer class="footer">
        <span>© {{ site.time | date: "%Y" }} {{ site.title }}.</span>
      </footer>
    </div>
  </body>
</html>
"""

nav_html = """<header class="nav">
  <div class="nav-left">
    <a class="brand" href="{{ '/' | relative_url }}">{{ site.title | upcase }}</a>
    <div class="subtitle">{{ site.description }}</div>
  </div>

  <nav class="nav-right">
    <a href="{{ '/' | relative_url }}" class="{% if page.url == '/' %}active{% endif %}">Home</a>
    <a href="{{ '/research/' | relative_url }}" class="{% if page.url contains '/research' %}active{% endif %}">Research</a>
    <a class="pill" href="#contact">Contact</a>
  </nav>
</header>
"""

hero_html = """<section class="hero" id="home">
  <div class="hero-left">
    <div class="kicker">{{ site.data.resume.kicker }}</div>
    <h1><span class="thin">{{ site.data.resume.first_name }}</span> {{ site.data.resume.last_name }}</h1>

    <p class="lead">{{ site.data.resume.blurb }}</p>

    <div class="chips">
      {% for c in site.data.resume.chips %}
        <span class="chip">{{ c }}</span>
      {% endfor %}
    </div>

    <div class="cta">
      <a class="btn" href="{{ '/research/' | relative_url }}">Research overview →</a>
      <a class="btn ghost" href="#contact">Get in touch →</a>
    </div>

    <div class="note"><strong>CV:</strong> available upon request (email me).</div>
  </div>

  <div class="hero-right">
    <img class="portrait" src="{{ site.data.resume.portrait | relative_url }}" alt="Portrait" />
  </div>
</section>
"""

contact_html = """<section id="contact" class="section">
  <h2>Get in touch</h2>

  <div class="card">
    <p class="muted">Email</p>
    <p class="mono big">{{ site.data.resume.email_obfuscated }}</p>

    <div class="cta" style="margin-top:12px">
      <button class="btn" id="emailBtn" type="button">Email me</button>
    </div>

    <p class="muted" style="margin-top:12px">
      If you’d like my CV, please email me and I’ll send it.
    </p>
  </div>

  <script>
    (function () {
      const btn = document.getElementById("emailBtn");
      if (!btn) return;

      btn.addEventListener("click", function () {
        const first = "{{ site.data.resume.first_name | downcase }}";
        const last  = "{{ site.data.resume.last_name  | downcase }}";
        const addr = first + "." + last + "@berkeley.edu";
        window.location.href = "mailto:" + addr + "?subject=Website%20contact";
      });
    })();
  </script>
</section>
"""

main_css = """:root{
  --bg:#fff; --fg:#0f172a; --muted:#5b6472; --line:#e7e9ee;
  --chip:#f3f5f8; --btn:#0f172a; --btnfg:#fff; --shadow: 0 10px 30px rgba(15,23,42,.08);
  --radius:16px; --max:1040px;
  --font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font-family:var(--font);line-height:1.55}
a{color:inherit;text-decoration:none}
a:hover{text-decoration:underline}

.container{max-width:var(--max);margin:0 auto;padding:26px 18px 56px}

.nav{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.brand{font-weight:900;letter-spacing:.06em}
.subtitle{color:var(--muted);font-size:14px;margin-top:2px}
.nav-right{display:flex;gap:14px;flex-wrap:wrap;justify-content:flex-end;align-items:center}
.nav-right a{color:var(--muted);font-size:14px}
.nav-right a:hover{color:var(--fg)}
.nav-right a.active{color:var(--fg);text-decoration:underline;text-underline-offset:6px}
.pill{padding:8px 12px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--fg)}

.hero{display:grid;grid-template-columns:1.25fr .75fr;gap:26px;padding:28px 0 10px}
.kicker{color:var(--muted);font-size:14px;margin-bottom:6px}
h1{font-size:46px;line-height:1.06;margin:6px 0 12px}
.thin{font-weight:300}
.lead{font-size:16px;color:var(--muted);max-width:68ch}
.portrait{width:100%;border-radius:22px;border:1px solid var(--line);box-shadow:var(--shadow)}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 18px}
.chip{background:var(--chip);border:1px solid var(--line);padding:8px 12px;border-radius:999px;font-size:13px;color:var(--fg)}

.cta{display:flex;gap:10px;flex-wrap:wrap}
.btn{background:var(--btn);color:var(--btnfg);padding:10px 14px;border-radius:999px;font-size:14px;border:1px solid var(--btn);cursor:pointer}
.btn:hover{opacity:.92;text-decoration:none}
.btn.ghost{background:#fff;color:var(--fg);border:1px solid var(--line)}
.note{margin-top:12px;color:var(--muted);font-size:14px}

.section{padding:22px 0;border-top:1px solid var(--line)}
.section h2{margin:0 0 10px;font-size:22px}
.card{border:1px solid var(--line);border-radius:var(--radius);padding:14px;background:#fff;box-shadow:0 6px 18px rgba(15,23,42,.05)}
.card h3{margin:0 0 6px;font-size:16px}
.muted{color:var(--muted);margin:0}
ul{margin:8px 0 0 20px}
.mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}
.big{font-size:16px}

.footer{margin-top:28px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}

@media (max-width: 860px){
  .hero{grid-template-columns:1fr}
  h1{font-size:38px}
}
"""

resume_yml = """first_name: "Alberto"
last_name: "Gennaro"
kicker: "Ph.D. Student in Industrial Engineering & OR — UC Berkeley"

blurb: "Stochastic control researcher focused on translating complex problems into practical, data-driven solutions."

portrait: "/assets/img/portrait.jpg"

# exactly as requested:
email_obfuscated: "my name at my last name at berkeley dot edu"

chips:
  - "Stochastic Control"
  - "Optimal Control"
  - "Numerical PDEs"
  - "Robust Optimization"
  - "Machine Learning"

research_focus: "Stochastic optimal control with uncertain horizon, approximate optimal control and numerical PDEs."

research_projects:
  - title: "Signature in optimal control (in progress)"
    bullets:
      - "Signature (rough path theory) to find approximate-optimal policies from time-series (REINFORCE)."
  - title: "Delegating portfolio management under time uncertainty"
    bullets:
      - "Principal-agent theory with a Second Order BSDE (2BSDE) under default risk; new HJB PDE."
      - "Numerical solution via iterative PINN in TensorFlow."
      - "Best Paper Finalist (top 6 papers) at SIAM."
  - title: "2BSDE with uncertain horizon and control in erratic environments"
    bullets:
      - "Existence/uniqueness results and a framework for robust control under time uncertainty."

teaching:
  - "Financial Engineering - UC Berkeley"
  - "Probability - Outstanding TA Award - UC Berkeley"
  - "Simulation - UC Berkeley"

experience:
  - where: "Amazon — Applied Scientist Intern (SCOT), Bellevue, WA"
    when: "Jun 2025 - Aug 2025"
  - where: "Kearney — Advanced Analytics Analyst, Milan, Italy"
    when: "Jan 2021 - Jun 2021"

talks:
  invited:
    - "Bachelier FS26 (Bologna)"
    - "SIAM FM25 (Miami)"
    - "WCMF25 (USC, Los Angeles)"
  other:
    - "INFORMS25 — INFORMS RAS competition (2nd place)"
"""

index_md = """---
layout: default
title: Home
---

{% include hero.html %}

<section class="section">
  <h2>At a glance</h2>
  <div class="card">
    <h3>Research focus</h3>
    <p class="muted">{{ site.data.resume.research_focus }}</p>
    <p style="margin-top:10px"><a href="{{ '/research/' | relative_url }}">Go to Research →</a></p>
  </div>
</section>

{% include contact.html %}
"""

research_md = """---
layout: default
title: Research
permalink: /research/
---

<section class="section" style="border-top:none; padding-top:10px">
  <h2>Research</h2>
  <p class="muted">{{ site.data.resume.research_focus }}</p>

  {% for p in site.data.resume.research_projects %}
  <div class="card" style="margin-top:12px">
    <h3>{{ p.title }}</h3>
    <ul>
      {% for b in p.bullets %}<li>{{ b }}</li>{% endfor %}
    </ul>
  </div>
  {% endfor %}
</section>

<section class="section">
  <h2>Teaching</h2>
  <div class="card">
    <ul>{% for t in site.data.resume.teaching %}<li>{{ t }}</li>{% endfor %}</ul>
  </div>
</section>

<section class="section">
  <h2>Experience</h2>
  <div class="card">
    <ul>
      {% for e in site.data.resume.experience %}
        <li><strong>{{ e.where }}</strong> <span class="muted">({{ e.when }})</span></li>
      {% endfor %}
    </ul>
  </div>
</section>

<section class="section">
  <h2>Conferences & talks</h2>
  <div class="card">
    <h3>Invited speaker</h3>
    <ul>{% for t in site.data.resume.talks.invited %}<li>{{ t }}</li>{% endfor %}</ul>
    <h3 style="margin-top:12px">Other</h3>
    <ul>{% for t in site.data.resume.talks.other %}<li>{{ t }}</li>{% endfor %}</ul>
  </div>
</section>

{% include contact.html %}
"""

# Write files
write("_config.yml", config_yml)
write("_layouts/default.html", default_html)
write("_includes/nav.html", nav_html)
write("_includes/hero.html", hero_html)
write("_includes/contact.html", contact_html)
write("assets/css/main.css", main_css)
write("_data/resume.yml", resume_yml)
write("index.md", index_md)
write("research.md", research_md)
