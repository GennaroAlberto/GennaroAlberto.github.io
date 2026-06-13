---
layout: default
title: Home
---

{% include hero.html %}

<section class="section reveal">
  <div class="section-head">
    <h2>News</h2>
    <span class="muted small">Recent activity</span>
  </div>
  <div class="news-list">
    {% for n in site.data.resume.news %}
      <div class="news-item">
        <span class="news-when">{{ n.when }}</span>
        <span class="news-what">{{ n.what }}</span>
      </div>
    {% endfor %}
  </div>
</section>

<section class="section reveal">
  <div class="section-head">
    <h2>Research focus</h2>
    <a class="link-more" href="{{ '/research/' | relative_url }}">All projects
      <svg class="ic-sm" aria-hidden="true"><use href="#i-arrow"/></svg>
    </a>
  </div>

  <div class="grid-2">
    <div class="card accent">
      <h3>What I work on</h3>
      <p class="muted">{{ site.data.resume.research_focus }}</p>
      <ul class="tight">
        <li>Time-series forecasting and policy learning from sequential data.</li>
        <li>Reinforcement learning for control — including signature-based methods.</li>
        <li>Stochastic control with uncertain horizons; PINN solvers for HJB-type PDEs.</li>
      </ul>
    </div>

    <div class="card">
      <h3>Selected papers</h3>
      {% for p in site.data.resume.publications limit:2 %}
        <div class="pub-mini">
          <div class="pub-title">{{ p.title }}</div>
          <div class="muted small">{{ p.venue }} · {{ p.year }}</div>
          <div class="pub-links">
            {% for l in p.links %}
              <a class="chip-link" href="{{ l.href }}" target="_blank" rel="noopener">{{ l.label }}</a>
            {% endfor %}
          </div>
        </div>
      {% endfor %}
      <p class="muted small" style="margin-top:10px">
        <a href="{{ '/publications/' | relative_url }}">See all publications →</a>
      </p>
    </div>
  </div>
</section>

<section class="section reveal">
  <div class="section-head"><h2>Highlights</h2></div>
  <div class="grid-3">
    {% for a in site.data.resume.awards %}
      <div class="card mini">
        <svg class="ic-md" aria-hidden="true"><use href="#i-spark"/></svg>
        <div class="award-body">
          {% if a.when %}<span class="award-when">{{ a.when }}</span>{% endif %}
          <p>
            {% if a.href %}<a href="{{ a.href }}" target="_blank" rel="noopener">{{ a.text }}</a>
            {% else %}{{ a.text }}{% endif %}
          </p>
        </div>
      </div>
    {% endfor %}
  </div>
</section>

{% include contact.html %}
