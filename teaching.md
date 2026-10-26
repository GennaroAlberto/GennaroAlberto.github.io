---
layout: default
title: Teaching
description: "Open lecture notes by Alberto Gennaro for UC Berkeley IEOR 222 (Financial Engineering) and MFE 230D (Derivatives: Quantitative Methods), and the courses he has taught."
permalink: /teaching/
---

<section class="section page-head reveal">
  <h2>Teaching</h2>
  <p class="lead">{{ site.data.resume.teaching_intro }}</p>
</section>

<section class="section reveal" id="notes">
  <h2>Open course notes</h2>
  <div class="grid-2">
    {% for c in site.data.resume.course_notes %}
      <article class="card project course">
        <div class="card-header">
          <span class="teach-code">{{ c.course }}</span>
          {% if c.status %}<span class="status">{{ c.status }}</span>{% endif %}
        </div>
        <h3>{{ c.title }}</h3>
        <p>{{ c.text }}</p>
        {% if c.credit %}<p class="course-credit">{{ c.credit }}</p>{% endif %}
        <div class="pub-links">
          <a class="chip-link" href="{{ c.repo }}" target="_blank" rel="noopener">
            <svg class="ic-sm" aria-hidden="true"><use href="#i-github"/></svg>GitHub
          </a>
          <a class="chip-link" href="{{ c.site }}notes.pdf" target="_blank" rel="noopener">
            <svg class="ic-sm" aria-hidden="true"><use href="#i-doc"/></svg>Notes (PDF)
          </a>
          <a class="chip-link" href="{{ c.site }}exercises.pdf" target="_blank" rel="noopener">
            <svg class="ic-sm" aria-hidden="true"><use href="#i-doc"/></svg>Exercises (PDF)
          </a>
        </div>
      </article>
    {% endfor %}
  </div>
</section>

<section class="section reveal" id="courses">
  <h2>Courses</h2>
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

