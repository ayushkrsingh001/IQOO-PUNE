import './style.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initHeroScene } from './scene.js';
import { trackEvent } from './analytics.js';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 3D hero ---------- */
initHeroScene(document.getElementById('bg3d'), prefersReducedMotion);

/* ---------- smooth scroll (Lenis + GSAP ticker) ---------- */
let lenis = null;
if (!prefersReducedMotion) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* anchor navigation through Lenis */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -90, duration: 1.1 });
    else target.scrollIntoView();
  });
});

/* ---------- mobile nav sheet ---------- */
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-links');
const navHeader = document.querySelector('header.nav');

if (navToggle && navMenu && navHeader) {
  const mqMobile = window.matchMedia('(max-width: 720px)');

  const setMenu = (open, { refocus = false } = {}) => {
    navMenu.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      const first = navMenu.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    } else if (refocus) {
      navToggle.focus({ preventScroll: true });
    }
  };
  const menuOpen = () => navMenu.classList.contains('is-open');

  navToggle.addEventListener('click', () => setMenu(!menuOpen()));

  /* link taps close the sheet; the shared anchor handler above runs the smooth scroll */
  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (menuOpen()) setMenu(false, { refocus: true });
    });
  });

  /* Esc closes and hands focus back to the toggle */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen()) {
      e.preventDefault();
      setMenu(false, { refocus: true });
    }
  });

  /* tapping outside the header closes the sheet */
  document.addEventListener('pointerdown', (e) => {
    if (menuOpen() && !navHeader.contains(e.target)) setMenu(false);
  });

  /* tabbing out of the header collapses it for keyboard users */
  document.addEventListener('focusin', (e) => {
    if (menuOpen() && !navHeader.contains(e.target)) setMenu(false);
  });

  /* growing past the mobile breakpoint resets the sheet */
  mqMobile.addEventListener('change', (mq) => {
    if (!mq.matches && menuOpen()) setMenu(false);
  });
}

/* ---------- marquee: duplicate track content for a seamless loop ---------- */
document.querySelectorAll('.marquee-track').forEach((track) => {
  track.innerHTML += track.innerHTML;
});

/* ---------- hero entrance ---------- */
if (!prefersReducedMotion) {
  const intro = gsap.timeline({ defaults: { ease: 'expo.out', duration: 0.9 } });
  intro
    .from('[data-hero="badge"]', { y: 26, opacity: 0, rotate: -6 }, 0.05)
    .from('.hero-title', { y: 54, opacity: 0 }, 0.14)
    .from('[data-hero="sub"]', { y: 36, opacity: 0 }, 0.26)
    .from('[data-hero="cta"] .store-btn', { y: 30, opacity: 0, stagger: 0.08, ease: 'back.out(1.7)' }, 0.38)
    .from('[data-hero="note"]', { opacity: 0 }, 0.55)
    .from('.hero-img-wrap', { y: 70, opacity: 0, rotate: 5, duration: 1.1 }, 0.2)
    .from('.stk, .hero-visual .chip', {
      scale: 0, opacity: 0, stagger: 0.09,
      ease: 'elastic.out(1, 0.55)', duration: 1.1,
    }, 0.55);

  /* gentle idle float for stickers */
  gsap.utils.toArray('[data-float]').forEach((el, i) => {
    gsap.to(el, {
      y: i % 2 ? 14 : -14,
      rotate: `+=${i % 2 ? 2.5 : -2.5}`,
      duration: 2.6 + i * 0.35,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  });

  /* hero parallax on scroll */
  gsap.to('.hero-visual', {
    yPercent: 8,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
  });
  gsap.to('.hero-decor', {
    yPercent: -18,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
  });
}

/* ---------- scroll reveals ---------- */
if (!prefersReducedMotion) {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 56,
      opacity: 0,
      duration: 0.9,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });

  /* spin decorations subtly while scrolling */
  gsap.utils.toArray('.burst, .ring').forEach((el) => {
    gsap.to(el, {
      rotate: 120,
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.4 },
    });
  });

  /* count-up stats */
  document.querySelectorAll('.stat-num').forEach((el) => {
    const target = parseInt(el.dataset.count || '0', 10);
    const state = { v: 0 };
    el.textContent = '0';
    gsap.to(state, {
      v: target,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: () => { el.textContent = String(Math.round(state.v)); },
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  /* pinned horizontal scroll-story for How to Play (desktop only) */
  const mmGsap = gsap.matchMedia();
  mmGsap.add('(min-width: 1021px) and (min-height: 760px)', () => {
    const play = document.querySelector('.play');
    const track = play.querySelector('.steps');
    const dots = gsap.utils.toArray('.play-progress i');
    play.classList.add('is-scrolly');
    /* bail out if the pinned stage still cannot fit the viewport (zoom, large fonts) */
    if (play.scrollHeight > window.innerHeight + 4) {
      play.classList.remove('is-scrolly');
      return () => {};
    }
    const amount = () => Math.max(track.scrollWidth - window.innerWidth, 0);
    gsap.to(track, {
      x: () => -amount(),
      ease: 'none',
      scrollTrigger: {
        trigger: play,
        start: 'top top',
        end: () => '+=' + (amount() + window.innerHeight * 0.35),
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const idx = Math.round(self.progress * (dots.length - 1));
          dots.forEach((d, i) => d.classList.toggle('on', i === idx));
        },
      },
    });
    return () => play.classList.remove('is-scrolly');
  });
}

/* ---------- monster card tilt ---------- */
const finePointer = window.matchMedia('(pointer: fine)').matches;
if (!prefersReducedMotion && finePointer) {
  document.querySelectorAll('.tilt').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.4, ease: 'power2.out' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.4, ease: 'power2.out' });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      rx(py * -8);
      ry(px * 10);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* ---------- nav scrollspy ---------- */
const spyPairs = new Map();
document.querySelectorAll('.nav-links a[href^="#"]').forEach((a) => {
  const sec = document.querySelector(a.getAttribute('href'));
  if (sec) spyPairs.set(sec, a);
});
const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const link = spyPairs.get(entry.target);
      if (!link) return;
      document.querySelectorAll('.nav-links a.active').forEach((x) => x.classList.remove('active'));
      link.classList.add('active');
    });
  },
  { rootMargin: '-35% 0px -55% 0px' }
);
spyPairs.forEach((_, sec) => spy.observe(sec));

/* ---------- deep links: realign initial hash after pin spacers change layout ---------- */
window.addEventListener('load', () => {
  const hash = window.location.hash;
  if (!hash || hash.length < 2 || hash === '#top') return;
  let target = null;
  try { target = document.querySelector(hash); } catch (err) { target = null; }
  if (!target) return;
  requestAnimationFrame(() => {
    const y = Math.max(target.getBoundingClientRect().top + window.scrollY - 90, 0);
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  });
});

/* ---------- store prototype modal ---------- */
const modal = document.getElementById('storeModal');
let lastTrigger = null;

const STORE_LABELS = { app: 'app_store', play: 'google_play' };

document.querySelectorAll('.store-btn').forEach((btn) => {
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.addEventListener('click', () => {
    const store = STORE_LABELS[btn.dataset.store] || 'unknown';
    const section = btn.closest('#download')
      ? 'download_cta'
      : btn.closest('.hero')
        ? 'hero'
        : 'other';
    trackEvent('store_button_click', { store, section });
    trackEvent('prototype_dialog_open', { store, section });
    lastTrigger = btn;
    modal.showModal();
    if (!prefersReducedMotion) {
      gsap.fromTo(
        '.modal-card',
        { scale: 0.82, y: 26, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.8)' }
      );
    }
  });
});

modal.querySelector('.modal-close').addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});
modal.addEventListener('close', () => {
  if (lastTrigger) lastTrigger.focus();
});

/* ---------- launch-list waitlist forms ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GENERIC_ERROR = 'Something broke on our side — please try again.';

document.querySelectorAll('.waitlist-form').forEach((form) => {
  const input = form.querySelector('.waitlist-input');
  const button = form.querySelector('.waitlist-btn');
  const msg = form.querySelector('.waitlist-msg');
  const idleLabel = button.textContent;

  const setMsg = (text, kind) => {
    msg.textContent = text;
    msg.classList.toggle('is-error', kind === 'error');
    msg.classList.toggle('is-success', kind === 'success');
    input.setAttribute('aria-invalid', kind === 'error' ? 'true' : 'false');
  };

  /* validate on blur; clear the error once typing resumes */
  input.addEventListener('blur', () => {
    const value = input.value.trim();
    if (value && !EMAIL_RE.test(value)) {
      setMsg('That email looks off — mind double-checking it?', 'error');
    }
  });
  input.addEventListener('input', () => {
    if (msg.classList.contains('is-error')) setMsg('', null);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.classList.contains('is-done')) return;

    const email = input.value.trim();
    if (!EMAIL_RE.test(email)) {
      setMsg('That email looks off — mind double-checking it?', 'error');
      input.focus();
      return;
    }

    button.disabled = true;
    button.textContent = 'Adding…';
    setMsg('', null);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: form.dataset.source || 'site',
          website: form.querySelector('.wl-hp')?.value || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw Object.assign(new Error('waitlist request failed'), { friendly: data.error });
      }
      form.classList.add('is-done');
      setMsg(
        data.status === 'exists'
          ? "You're already on the list — we'll holler at launch."
          : "You're on the list! One email at launch, zero spam.",
        'success'
      );
      if (!prefersReducedMotion) {
        gsap.from(msg, { scale: 0.85, y: 8, opacity: 0, duration: 0.45, ease: 'back.out(1.8)' });
      }
    } catch (err) {
      button.disabled = false;
      button.textContent = idleLabel;
      setMsg(err.friendly || GENERIC_ERROR, 'error');
    }
  });
});

/* ---------- misc ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

window.addEventListener('load', () => ScrollTrigger.refresh());
