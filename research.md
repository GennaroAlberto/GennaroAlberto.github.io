---
layout: default
title: Research
permalink: /research/
---

<section class="section page-head reveal">
  <h2>Research</h2>
  <p class="lead">{{ site.data.resume.research_focus }}</p>
</section>

<section class="section reveal">
  <h2>Projects</h2>
  <div class="grid-2">
    {% for p in site.data.resume.research_projects %}
      <div class="card project">
        <div class="card-header">
          <h3>{{ p.title }}</h3>
          {% if p.status %}<span class="status">{{ p.status }}</span>{% endif %}
        </div>
        <ul class="tight">
          {% for b in p.bullets %}<li>{{ b | markdownify | remove: '<p>' | remove: '</p>' }}</li>{% endfor %}
        </ul>
        {% if p.links %}
        <div class="pub-links">
          {% for l in p.links %}
            <a class="chip-link" href="{{ l.href }}" target="_blank" rel="noopener">{{ l.label }}</a>
          {% endfor %}
        </div>
        {% endif %}
      </div>
    {% endfor %}
  </div>
</section>

<section class="section reveal">
  <h2>Experience</h2>
  <div class="timeline">
    {% for e in site.data.resume.experience %}
      <div class="tl-item">
        <div class="tl-dot"></div>
        <div class="tl-body">
          <div class="tl-when">{{ e.when }}</div>
          <div class="tl-where"><strong>{{ e.where }}</strong>{% if e.location %} <span class="muted">— {{ e.location }}</span>{% endif %}</div>
        </div>
      </div>
    {% endfor %}
  </div>
</section>

<section class="section reveal">
  <h2>Education</h2>
  <div class="timeline">
    {% for ed in site.data.resume.education %}
      <div class="tl-item">
        <div class="tl-dot"></div>
        <div class="tl-body">
          {% if ed.when != "" %}<div class="tl-when">{{ ed.when }}</div>{% endif %}
          <div class="tl-where">{{ ed.where }}</div>
        </div>
      </div>
    {% endfor %}
  </div>
</section>

<section class="section reveal">
  <h2>Teaching</h2>
  <div class="card">
    <ul class="teach-list">
      {% for t in site.data.resume.teaching %}
        <li class="teach-item">
          <div class="teach-line">
            <span class="teach-code">{{ t.course }}</span>
            <span class="teach-title">{{ t.title }}</span>
          </div>
          <div class="teach-meta">
            <span class="teach-role {% if t.role == 'Lecturer' %}lect{% endif %}">{{ t.role }}</span>
            <span class="muted">{{ t.terms }}</span>
            {% if t.note %}<span class="teach-note">· {{ t.note }}</span>{% endif %}
          </div>
        </li>
      {% endfor %}
    </ul>
  </div>
</section>

<section class="section reveal">
  <h2>Talks &amp; conferences</h2>
  <div class="grid-2">
    <div class="card">
      <h3>Invited speaker</h3>
      <ul class="tight">{% for t in site.data.resume.talks.invited %}<li>{{ t }}</li>{% endfor %}</ul>
    </div>
    <div class="card">
      <h3>Other</h3>
      <ul class="tight">{% for t in site.data.resume.talks.other %}<li>{{ t }}</li>{% endfor %}</ul>
    </div>
  </div>
</section>

<section class="section reveal">
  <h2>Awards</h2>
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
