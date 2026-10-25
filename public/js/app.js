// CodeWithAnup - Main Application Logic, Lenis Smooth Scroll & Folioblox Aesthetics
let siteData = null;

// Typewriter Engine
class Typewriter {
  constructor(element, phrases, loopDelay = 2200) {
    this.element = element;
    this.phrases = phrases || [];
    this.loopDelay = loopDelay;
    this.phraseIndex = 0;
    this.charIndex = 0;
    this.isDeleting = false;
    this.typingSpeed = 85;
    this.deletingSpeed = 40;

    if (this.element && this.phrases.length) {
      this.type();
    }
  }

  updatePhrases(phrases) {
    this.phrases = phrases;
    this.phraseIndex = 0;
    this.charIndex = 0;
    this.isDeleting = false;
  }

  type() {
    const currentPhrase = this.phrases[this.phraseIndex] || '';
    
    if (this.isDeleting) {
      this.element.textContent = currentPhrase.substring(0, this.charIndex - 1);
      this.charIndex--;
    } else {
      this.element.textContent = currentPhrase.substring(0, this.charIndex + 1);
      this.charIndex++;
    }

    let speed = this.isDeleting ? this.deletingSpeed : this.typingSpeed;

    if (!this.isDeleting && this.charIndex === currentPhrase.length) {
      speed = this.loopDelay;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.phraseIndex = (this.phraseIndex + 1) % this.phrases.length;
      speed = 350;
    }

    setTimeout(() => this.type(), speed);
  }
}

// Notification Toast Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'border-red-500 bg-red-950 text-white' : 'border-orange-500 bg-slate-900 text-white'}`;
  toast.innerHTML = `<div class="flex items-center gap-2"><span>${type === 'error' ? '⚠️' : '✨'}</span> <span>${message}</span></div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Main App Controller
class App {
  constructor() {
    this.typewriter = null;
    this.activeProjectFilter = 'All';
    this.init();
  }

  async init() {
    this.setupLenis();
    this.setupTheme();
    this.setupScrollProgress();
    this.setupSmoothAnchorScroll();
    this.setupSearchModal();
    this.setupMobileMenu();
    this.setupContactForm();
    await this.fetchSiteData();
    this.setupSectionObserver();
  }

  setupLenis() {
    if (typeof Lenis !== 'undefined') {
      try {
        const lenis = new Lenis({
          duration: 1.25,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 1.0,
          touchMultiplier: 1.8
        });

        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
        window.lenis = lenis;
      } catch (err) {
        console.warn('Lenis smooth scroll fallback to native smooth scroll');
      }
    }
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('cwa_theme') || 'dark';
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      document.documentElement.classList.remove('dark');
    } else {
      document.body.classList.remove('light-theme');
      document.documentElement.classList.add('dark');
    }

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        if (isLight) {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('cwa_theme', 'light');
          themeToggleBtn.innerHTML = '🌙';
        } else {
          document.documentElement.classList.add('dark');
          localStorage.setItem('cwa_theme', 'dark');
          themeToggleBtn.innerHTML = '☀️';
        }
      });
      themeToggleBtn.innerHTML = savedTheme === 'light' ? '🌙' : '☀️';
    }
  }

  setupScrollProgress() {
    const progressBar = document.getElementById('scroll-progress');
    window.addEventListener('scroll', () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      if (progressBar) progressBar.style.width = scrolled + '%';
    }, { passive: true });
  }

  setupSmoothAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId && targetId !== '#' && targetId.length > 1) {
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            e.preventDefault();
            if (window.lenis) {
              window.lenis.scrollTo(targetEl, { offset: -70 });
            } else {
              const navOffset = 70;
              const elementPosition = targetEl.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - navOffset;
              window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }

            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
              mobileMenu.classList.add('hidden');
            }
          }
        }
      });
    });
  }

  setupSectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.scroll-reveal, .reveal-on-scroll').forEach(el => observer.observe(el));
  }

  setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
    }
  }

  async fetchSiteData() {
    try {
      const res = await fetch('/api/site-data');
      if (!res.ok) throw new Error('API error');
      siteData = await res.json();
      this.renderAll();
    } catch (err) {
      console.warn('Could not load site data from API', err);
    }
  }

  renderAll() {
    if (!siteData) return;
    this.renderHero();
    this.renderBackgroundConfig();
    this.renderStats();
    this.renderProjects();
    this.renderNotes();
    this.renderBlogs();
    this.renderSkills();
    this.renderSocialLinks();
    this.renderFooter();
  }

  renderHero() {
    const p = siteData.profile;
    if (!p) return;

    const brandEls = document.querySelectorAll('.site-brand-name');
    brandEls.forEach(el => el.innerHTML = `${p.name || 'Anup'}<span class="text-orange-500">.</span>`);

    const heroBio = document.getElementById('hero-bio');
    if (heroBio) heroBio.textContent = p.bio || '';

    const typingSpan = document.getElementById('typewriter-text');
    if (typingSpan) {
      const phrases = p.typingPhrases && p.typingPhrases.length ? p.typingPhrases : [
        "Full Stack Web Engineering",
        "React & Next.js Ecosystems",
        "Data Structures & Algorithms",
        "Modern API Architectures"
      ];
      if (!this.typewriter) {
        this.typewriter = new Typewriter(typingSpan, phrases);
      } else {
        this.typewriter.updatePhrases(phrases);
      }
    }
  }

  renderBackgroundConfig() {
    const bg = siteData.background;
    if (!bg) return;

    const fullBgPhoto = document.getElementById('full-bg-photo');
    if (fullBgPhoto && bg.customImage) {
      fullBgPhoto.style.backgroundImage = `url("${bg.customImage}")`;
      fullBgPhoto.style.opacity = bg.overlayOpacity !== undefined ? bg.overlayOpacity : 0.45;
      fullBgPhoto.style.filter = `blur(${bg.blur !== undefined ? bg.blur : 0}px)`;
    }

    if (window.SmoothBgEngine) {
      window.SmoothBgEngine.updateSettings({
        customImage: bg.customImage || '/images/anup-cinematic.jpg',
        overlayOpacity: bg.overlayOpacity !== undefined ? bg.overlayOpacity : 0.45,
        blur: bg.blur !== undefined ? bg.blur : 0,
        type: bg.type || 'particles',
        accentColor: bg.accentColor || '#f97316',
        secondaryColor: bg.secondaryColor || '#ec4899',
        particleCount: bg.particleCount || 45,
        particleSpeed: bg.particleSpeed || 0.8
      });
    }
  }

  renderStats() {
    const p = siteData.profile;
    if (!p) return;

    const statsContainer = document.getElementById('hero-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="p-3 rounded-2xl bg-slate-950/40 border border-white/10 text-center">
          <div class="text-xl sm:text-2xl font-black text-white">${p.experience || 'CSE Undergrad'}</div>
          <div class="text-[11px] text-gray-400 mt-0.5">Status</div>
        </div>
        <div class="p-3 rounded-2xl bg-slate-950/40 border border-white/10 text-center">
          <div class="text-xl sm:text-2xl font-black text-orange-400">${p.projectsCount || '25+'}</div>
          <div class="text-[11px] text-gray-400 mt-0.5">Web Projects</div>
        </div>
        <div class="p-3 rounded-2xl bg-slate-950/40 border border-white/10 text-center">
          <div class="text-xl sm:text-2xl font-black text-white">${(siteData.notes || []).length}+</div>
          <div class="text-[11px] text-gray-400 mt-0.5">Study Notes</div>
        </div>
      `;
    }
  }

  renderProjects() {
    const container = document.getElementById('projects-grid');
    if (!container || !siteData.projects) return;

    const filtered = this.activeProjectFilter === 'All'
      ? siteData.projects
      : siteData.projects.filter(p => p.category.toLowerCase().includes(this.activeProjectFilter.toLowerCase()));

    container.innerHTML = filtered.map(p => `
      <div class="folio-card group flex flex-col justify-between">
        <div class="relative overflow-hidden aspect-[16/10] bg-slate-950">
          <img src="${p.image}" alt="${p.title}" class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-60"></div>
          <div class="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-orange-400 text-xs font-bold px-3 py-1 rounded-full border border-orange-500/30">
            ${p.category}
          </div>
        </div>
        <div class="p-7 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
              ${p.title}
            </h3>
            <p class="text-sm text-gray-400 mt-2 line-clamp-3 leading-relaxed">
              ${p.description}
            </p>
            <div class="flex flex-wrap gap-1.5 mt-4">
              ${(p.tags || []).map(t => `
                <span class="text-xs px-2.5 py-1 rounded-full bg-slate-800/80 text-gray-300 border border-white/10 font-mono">
                  ${t}
                </span>
              `).join('')}
            </div>
          </div>
          <div class="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-3">
            <a href="${p.githubUrl || '#'}" target="_blank" rel="noopener" class="text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors">
              <span>🐙 GitHub</span>
            </a>
            <a href="${p.liveUrl || '#'}" target="_blank" rel="noopener" class="btn-touch text-xs py-1.5 px-3">
              <span>Live Demo</span>
              <span class="arrow-circle text-xs w-6 h-6">↗</span>
            </a>
          </div>
        </div>
      </div>
    `).join('');

    this.renderProjectFilters();
  }

  renderProjectFilters() {
    const filterContainer = document.getElementById('project-filters');
    if (!filterContainer || !siteData.projects) return;

    const categories = ['All', ...new Set(siteData.projects.map(p => p.category))];
    filterContainer.innerHTML = categories.map(cat => `
      <button class="filter-pill ${this.activeProjectFilter === cat ? 'active' : ''}" data-cat="${cat}">
        ${cat}
      </button>
    `).join('');

    filterContainer.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.activeProjectFilter = e.currentTarget.getAttribute('data-cat');
        this.renderProjects();
      });
    });
  }

  renderNotes() {
    const container = document.getElementById('notes-grid');
    if (!container || !siteData.notes) return;

    container.innerHTML = siteData.notes.map(n => `
      <div class="folio-card p-6 flex flex-col justify-between hover:border-orange-500/40">
        <div>
          <div class="flex items-center justify-between mb-4">
            <span class="w-10 h-10 rounded-xl bg-orange-950/60 border border-orange-500/30 flex items-center justify-center text-xl">
              📄
            </span>
            <span class="text-xs font-mono text-orange-400 bg-orange-950/40 px-2.5 py-1 rounded-full border border-orange-500/20">
              ${n.pages || 'PDF'}
            </span>
          </div>
          <h3 class="text-lg font-bold text-white mb-2">${n.title}</h3>
          <p class="text-sm text-gray-400 leading-relaxed mb-4">${n.description}</p>
        </div>
        <div class="pt-4 border-t border-white/10 flex items-center justify-between">
          <span class="text-xs text-gray-400">📥 ${n.downloads || '5k+'}</span>
          <a href="${n.fileUrl || '#'}" class="px-3.5 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-md">
            Download
          </a>
        </div>
      </div>
    `).join('');
  }

  renderBlogs() {
    const container = document.getElementById('blogs-grid');
    if (!container || !siteData.blogs) return;

    container.innerHTML = siteData.blogs.map(b => `
      <div class="folio-card group flex flex-col justify-between">
        <div class="aspect-video overflow-hidden bg-slate-950">
          <img src="${b.image}" alt="${b.title}" class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" loading="lazy" />
        </div>
        <div class="p-6 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 text-xs text-gray-400 mb-2 font-mono">
              <span class="text-orange-400 font-bold">${b.category}</span>
              <span>•</span>
              <span>${b.date}</span>
              <span>•</span>
              <span>${b.readTime}</span>
            </div>
            <h3 class="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
              ${b.title}
            </h3>
            <p class="text-sm text-gray-400 mt-2 line-clamp-3 leading-relaxed">
              ${b.excerpt}
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-white/10">
            <a href="${b.link || '#blog'}" class="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Read Article <span>→</span>
            </a>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderSkills() {
    const container = document.getElementById('skills-grid');
    if (!container || !siteData.skills) return;

    container.innerHTML = siteData.skills.map(s => `
      <div>
        <div class="flex justify-between items-center text-xs font-semibold mb-1.5">
          <span class="text-white">${s.name}</span>
          <span class="text-orange-400 font-mono">${s.level}</span>
        </div>
        <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div class="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full" style="width: ${s.level}"></div>
        </div>
      </div>
    `).join('');
  }

  renderSocialLinks() {
    const sl = siteData.socialLinks;
    if (!sl) return;

    const container = document.getElementById('social-links-container');
    if (container) {
      container.innerHTML = `
        <a href="${sl.github || '#'}" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-slate-900/80 border border-white/15 flex items-center justify-center text-gray-300 hover:text-white hover:border-white transition-all shadow-md" title="GitHub">🐙</a>
        <a href="${sl.linkedin || '#'}" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-slate-900/80 border border-white/15 flex items-center justify-center text-gray-300 hover:text-blue-400 hover:border-blue-400 transition-all shadow-md" title="LinkedIn">💼</a>
        <a href="${sl.twitter || '#'}" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-slate-900/80 border border-white/15 flex items-center justify-center text-gray-300 hover:text-sky-400 hover:border-sky-400 transition-all shadow-md" title="Twitter / X">🐦</a>
        <a href="${sl.youtube || '#'}" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-slate-900/80 border border-white/15 flex items-center justify-center text-gray-300 hover:text-red-400 hover:border-red-400 transition-all shadow-md" title="YouTube">📺</a>
      `;
    }
  }

  renderFooter() {
    const footerTagline = document.getElementById('footer-tagline');
    if (footerTagline && siteData.footer) {
      footerTagline.textContent = siteData.footer.tagline || 'Computer Science & Engineering Student & Web Developer.';
    }
  }

  setupSearchModal() {
    const modal = document.getElementById('search-modal');
    const openBtn = document.getElementById('open-search-btn');
    const closeBtn = document.getElementById('close-search-btn');
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');

    if (!modal || !openBtn || !input) return;

    openBtn.addEventListener('click', () => {
      modal.classList.add('active');
      input.focus();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        modal.classList.add('active');
        input.focus();
      }
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        modal.classList.remove('active');
      }
    });

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      if (!query || !siteData) {
        resultsContainer.innerHTML = '<div class="text-sm text-gray-400 p-4 text-center">Type to search projects, notes, articles...</div>';
        return;
      }

      const matchingProjects = (siteData.projects || []).filter(p => p.title.toLowerCase().includes(query) || (p.tags && p.tags.some(t => t.toLowerCase().includes(query))));
      const matchingNotes = (siteData.notes || []).filter(n => n.title.toLowerCase().includes(query));
      const matchingBlogs = (siteData.blogs || []).filter(b => b.title.toLowerCase().includes(query));

      let html = '';
      if (matchingProjects.length) {
        html += '<div class="text-xs font-bold text-orange-400 px-4 py-2 uppercase">Projects</div>';
        matchingProjects.forEach(p => {
          html += `<a href="#projects" onclick="document.getElementById('search-modal').classList.remove('active')" class="block px-4 py-2.5 hover:bg-slate-800 rounded transition-colors text-white font-medium text-sm flex justify-between"><span>${p.title}</span> <span class="text-xs text-gray-400 font-mono">${p.category}</span></a>`;
        });
      }

      if (matchingNotes.length) {
        html += '<div class="text-xs font-bold text-blue-400 px-4 py-2 mt-2 uppercase">Study Notes</div>';
        matchingNotes.forEach(n => {
          html += `<a href="#notes" onclick="document.getElementById('search-modal').classList.remove('active')" class="block px-4 py-2.5 hover:bg-slate-800 rounded transition-colors text-white font-medium text-sm flex justify-between"><span>${n.title}</span> <span class="text-xs text-gray-400 font-mono">${n.pages}</span></a>`;
        });
      }

      if (matchingBlogs.length) {
        html += '<div class="text-xs font-bold text-pink-400 px-4 py-2 mt-2 uppercase">Articles</div>';
        matchingBlogs.forEach(b => {
          html += `<a href="#blogs" onclick="document.getElementById('search-modal').classList.remove('active')" class="block px-4 py-2.5 hover:bg-slate-800 rounded transition-colors text-white font-medium text-sm flex justify-between"><span>${b.title}</span> <span class="text-xs text-gray-400 font-mono">${b.category}</span></a>`;
        });
      }

      if (!html) {
        html = `<div class="text-sm text-gray-400 p-6 text-center">No results found for "${query}"</div>`;
      }

      resultsContainer.innerHTML = html;
    });
  }

  setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending...';

      const formData = {
        name: form.name.value,
        email: form.email.value,
        subject: form.subject ? form.subject.value : 'Portfolio Inquiry',
        message: form.message.value
      };

      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          showToast('Message sent! Anup will get back to you shortly.');
          form.reset();
        } else {
          showToast('Failed to send message', 'error');
        }
      } catch (err) {
        showToast('Error connecting to server', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
