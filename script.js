(() => {
  'use strict';

  const SONG_URL = 'https://youtu.be/u7MxCuYPQT4?si=RKe_qPUiR46ffVqe';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     CURSOR GLOW
  --------------------------------------------------------- */
  const cursorGlow = document.querySelector('.cursor-glow');
  if (cursorGlow && !prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let tx = cx;
    let ty = cy;
    let glowAnimId = null;

    window.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
    }, { passive: true });

    const animateGlow = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      cursorGlow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      glowAnimId = requestAnimationFrame(animateGlow);
    };
    glowAnimId = requestAnimationFrame(animateGlow);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (glowAnimId) cancelAnimationFrame(glowAnimId);
      } else {
        glowAnimId = requestAnimationFrame(animateGlow);
      }
    });
  } else if (cursorGlow) {
    cursorGlow.style.display = 'none';
  }

  /* ---------------------------------------------------------
     SCROLL PROGRESS BAR
  --------------------------------------------------------- */
  const scrollFill = document.getElementById('scrollFill');
  const timelineFill = document.getElementById('timelineFill');
  const timelineTrack = document.querySelector('.timeline__track');

  const updateScrollProgress = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (scrollFill) scrollFill.style.width = `${progress}%`;

    if (timelineFill && timelineTrack) {
      const rect = timelineTrack.getBoundingClientRect();
      const viewportCenter = window.innerHeight * 0.5;
      const trackHeight = rect.height;
      let localProgress = 0;
      if (trackHeight > 0) {
        localProgress = ((viewportCenter - rect.top) / trackHeight) * 100;
        localProgress = Math.min(100, Math.max(0, localProgress));
      }
      timelineFill.style.height = `${localProgress}%`;
    }
  };

  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      updateScrollProgress();
      scrollTicking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateScrollProgress);
  updateScrollProgress();

  /* ---------------------------------------------------------
     BEGIN THE SURPRISE — transition + open song + scroll
  --------------------------------------------------------- */
  const beginBtn = document.getElementById('beginBtn');
  const transitionVeil = document.getElementById('transitionVeil');
  const timelineTarget = document.getElementById('timeline');

  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      window.open(SONG_URL, '_blank', 'noopener,noreferrer');

      if (transitionVeil) {
        transitionVeil.classList.add('active');
      }

      const revealDelay = prefersReducedMotion ? 300 : 900;
      const veilHoldTime = prefersReducedMotion ? 200 : 900;

      window.setTimeout(() => {
        if (timelineTarget) {
          timelineTarget.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        }
        window.setTimeout(() => {
          if (transitionVeil) transitionVeil.classList.remove('active');
        }, veilHoldTime);
      }, revealDelay);
    });
  }

  /* ---------------------------------------------------------
     REPLAY BUTTON
  --------------------------------------------------------- */
  const replayBtn = document.getElementById('replayBtn');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------
     GENERIC REVEAL-ON-SCROLL OBSERVER
  --------------------------------------------------------- */
  const revealTargets = document.querySelectorAll(
    '.timeline__item, .quote__text, .final-message__line'
  );

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' }
    );

    revealTargets.forEach((el) => revealObserver.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('in-view'));
  }

  /* ---------------------------------------------------------
     FLOATING HEARTS
  --------------------------------------------------------- */
  const heartsContainer = document.getElementById('floatingHearts');
  let heartsInterval = null;

  const spawnHeart = () => {
    if (!heartsContainer) return;
    const heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = Math.random() > 0.5 ? '❤️' : '💗';
    const startX = Math.random() * 100;
    const drift = (Math.random() * 160 - 80) + 'px';
    const duration = 6 + Math.random() * 5;
    const size = 0.9 + Math.random() * 1.2;

    heart.style.left = `${startX}%`;
    heart.style.setProperty('--drift', drift);
    heart.style.fontSize = `${size}rem`;
    heart.style.animationDuration = `${duration}s`;

    heartsContainer.appendChild(heart);
    window.setTimeout(() => heart.remove(), duration * 1000 + 200);
  };

  const startHearts = () => {
    if (!heartsContainer || heartsInterval || prefersReducedMotion) return;
    heartsContainer.style.display = 'block';
    for (let i = 0; i < 6; i++) {
      window.setTimeout(spawnHeart, i * 300);
    }
    heartsInterval = window.setInterval(spawnHeart, 550);
  };

  const stopHearts = () => {
    if (heartsInterval) {
      clearInterval(heartsInterval);
      heartsInterval = null;
    }
  };

  /* ---------------------------------------------------------
     CONFETTI
  --------------------------------------------------------- */
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let confettiPieces = [];
  let confettiAnimId = null;
  let confettiRunning = false;

  const confettiColors = ['#e8b8cc', '#d3ab6e', '#f4ede4', '#d68fae', '#e8cda1'];

  const resizeCanvas = () => {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const createConfettiPiece = () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * window.innerHeight * 0.5,
    w: 6 + Math.random() * 6,
    h: 10 + Math.random() * 8,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 8,
    speedY: 1.5 + Math.random() * 2.5,
    speedX: (Math.random() - 0.5) * 2,
    opacity: 1
  });

  const runConfetti = () => {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confettiPieces.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;
      if (p.y > canvas.height + 30) {
        p.opacity -= 0.02;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(p.opacity, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    confettiPieces = confettiPieces.filter((p) => p.opacity > 0);

    if (confettiPieces.length > 0) {
      confettiAnimId = requestAnimationFrame(runConfetti);
    } else {
      confettiRunning = false;
      canvas.style.display = 'none';
    }
  };

  const startConfetti = () => {
    if (!canvas || !ctx || confettiRunning || prefersReducedMotion) return;
    resizeCanvas();
    canvas.style.display = 'block';
    confettiPieces = [];
    for (let i = 0; i < 140; i++) {
      confettiPieces.push(createConfettiPiece());
    }
    confettiRunning = true;
    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    confettiAnimId = requestAnimationFrame(runConfetti);
  };

  /* ---------------------------------------------------------
     TRIGGER HEARTS + CONFETTI WHEN ENDING SECTION IS REACHED
  --------------------------------------------------------- */
  const endingSection = document.getElementById('ending');

  if (endingSection && 'IntersectionObserver' in window) {
    let hasCelebrated = false;
    const endingObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startHearts();
            if (!hasCelebrated) {
              hasCelebrated = true;
              startConfetti();
            }
          } else {
            stopHearts();
          }
        });
      },
      { threshold: 0.4 }
    );
    endingObserver.observe(endingSection);
  }

  /* ---------------------------------------------------------
     AMBIENT FLOATING PARTICLES (elegant gold/pink dust)
  --------------------------------------------------------- */
  const particlesCanvas = document.getElementById('particlesCanvas');
  const pCtx = particlesCanvas ? particlesCanvas.getContext('2d') : null;

  if (particlesCanvas && pCtx && !prefersReducedMotion) {
    const particleColors = ['rgba(232,184,204,', 'rgba(211,171,110,', 'rgba(244,237,228,'];
    let particles = [];
    let particleAnimId = null;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    const PARTICLE_COUNT = isMobile ? 24 : 46;

    const sizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      particlesCanvas.width = window.innerWidth * dpr;
      particlesCanvas.height = window.innerHeight * dpr;
      particlesCanvas.style.width = `${window.innerWidth}px`;
      particlesCanvas.style.height = `${window.innerHeight}px`;
      pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createParticle = (randomY) => ({
      x: Math.random() * window.innerWidth,
      y: randomY ? Math.random() * window.innerHeight : window.innerHeight + 20,
      r: 0.6 + Math.random() * 1.8,
      speed: 0.15 + Math.random() * 0.35,
      drift: (Math.random() - 0.5) * 0.3,
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 0.002 + Math.random() * 0.004,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
      opacity: 0.15 + Math.random() * 0.45
    });

    const initParticles = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(true));
    };

    let frame = 0;
    const renderParticles = () => {
      frame++;
      pCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += Math.sin(frame * p.swaySpeed + p.swayOffset) * 0.3 + p.drift * 0.1;

        if (p.y < -20) {
          Object.assign(p, createParticle(false));
        }

        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pCtx.fillStyle = `${p.color}${p.opacity})`;
        pCtx.fill();
      });

      particleAnimId = requestAnimationFrame(renderParticles);
    };

    sizeCanvas();
    initParticles();
    particleAnimId = requestAnimationFrame(renderParticles);

    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(sizeCanvas, 150);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (particleAnimId) cancelAnimationFrame(particleAnimId);
      } else {
        particleAnimId = requestAnimationFrame(renderParticles);
      }
    });
  }

  /* ---------------------------------------------------------
     GALLERY KEYBOARD ACCESSIBILITY (focus parity with hover)
  --------------------------------------------------------- */
  document.querySelectorAll('.gallery__item').forEach((item) => {
    item.setAttribute('tabindex', '0');
    item.addEventListener('focus', () => item.classList.add('is-focused'));
    item.addEventListener('blur', () => item.classList.remove('is-focused'));
  });

})();
