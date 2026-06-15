---
layout: default
title: Experience
permalink: /experience/
---

<section class="section page-head reveal">
  <h2>Experience</h2>
  <p class="lead">
    Industry roles in supply-chain optimization, advanced analytics, and machine
    learning for financial services.
  </p>
</section>

<section class="section reveal">
  <div class="exp-list">
    {% for e in site.data.resume.experience %}
      <article class="card exp">
        <div class="exp-rail" aria-hidden="true">{{ e.when }}</div>
        <div class="exp-body">
          <div class="exp-head">
            <h3 class="exp-where">
              {{ e.where }}
              {% if e.status %}<span class="status">{{ e.status }}</span>{% endif %}
            </h3>
            <div class="exp-meta">
              {% if e.role %}<span class="exp-role">{{ e.role }}</span>{% endif %}
              {% if e.team %}<span class="muted">· {{ e.team }}</span>{% endif %}
              {% if e.location %}<span class="muted">· {{ e.location }}</span>{% endif %}
            </div>
          </div>
          {% if e.summary %}
            <div class="exp-summary">{{ e.summary | markdownify }}</div>
          {% endif %}
        </div>
      </article>
    {% endfor %}
  </div>
</section>

{% include contact.html %}
