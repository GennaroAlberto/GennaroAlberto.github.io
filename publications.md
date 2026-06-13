---
layout: default
title: Publications
permalink: /publications/
---

<section class="section page-head reveal">
  <h2>Publications &amp; preprints</h2>
  <p class="lead">
    A current list of papers. The most complete reference is my
    <a href="https://scholar.google.com/citations?user=fHtUhuMAAAAJ" target="_blank" rel="noopener">Google Scholar profile</a>;
    code accompanying papers lives on
    <a href="https://github.com/GennaroAlberto" target="_blank" rel="noopener">GitHub</a>.
  </p>
</section>

<section class="section reveal">
  <div class="pub-list">
    {% for p in site.data.resume.publications %}
      <article class="card pub">
        <div class="pub-year-rail" aria-hidden="true">{{ p.year }}</div>
        <div class="pub-body">
          <h3 class="pub-title">{{ p.title }}</h3>
          <div class="muted small">{{ p.authors }}</div>
          <div class="muted small pub-venue">{{ p.venue }} · {{ p.year }}</div>
          <p class="pub-summary">{{ p.summary }}</p>
          <div class="pub-links">
            {% for l in p.links %}
              <a class="chip-link" href="{{ l.href }}" target="_blank" rel="noopener">
                {{ l.label }}
                <svg class="ic-xs" aria-hidden="true"><use href="#i-arrow"/></svg>
              </a>
            {% endfor %}
          </div>
        </div>
      </article>
    {% endfor %}
  </div>
</section>

{% include contact.html %}
