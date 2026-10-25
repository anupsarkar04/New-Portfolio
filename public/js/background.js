// CodeWithAnup - Interactive Canvas & Full-Background Photo Scroll Animation Engine
class SmoothBackground {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 140 };
    this.scrollY = 0;
    this.scrollVelocity = 0;
    this.lastScrollY = 0;
    this.particleCount = 65;
    this.speedFactor = 1.0;
    this.accentColor = '#7c3aed';
    this.secondaryColor = '#ec4899';
    this.mode = 'particles'; // 'particles', 'nebula', 'waves'

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY + window.scrollY;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;
      this.scrollVelocity = (currentScroll - this.lastScrollY) * 0.15;
      this.lastScrollY = currentScroll;
      this.scrollY = currentScroll;
    }, { passive: true });

    this.createParticles();
    this.animate();
  }

  setSettings(settings) {
    if (!settings) return;
    if (settings.particleCount) this.particleCount = parseInt(settings.particleCount, 10);
    if (settings.particleSpeed) this.speedFactor = parseFloat(settings.particleSpeed);
    if (settings.accentColor) this.accentColor = settings.accentColor;
    if (settings.secondaryColor) this.secondaryColor = settings.secondaryColor;
    if (settings.type) this.mode = settings.type;
    this.createParticles();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    const count = Math.min(this.particleCount, Math.floor((this.width * this.height) / 14000));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.7 * this.speedFactor,
        vy: (Math.random() - 0.5) * 0.7 * this.speedFactor,
        size: Math.random() * 2.2 + 1.0,
        color: Math.random() > 0.4 ? this.accentColor : this.secondaryColor,
        alpha: Math.random() * 0.4 + 0.2
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.scrollVelocity *= 0.92;

    if (this.mode === 'nebula') {
      this.drawNebula();
    } else if (this.mode === 'waves') {
      this.drawWaves();
    } else {
      this.drawParticles();
    }

    requestAnimationFrame(() => this.animate());
  }

  drawParticles() {
    const isDark = document.documentElement.classList.contains('dark');
    const baseAlpha = isDark ? 0.35 : 0.2;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy - (this.scrollVelocity * 0.2);

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      if (this.mouse.x !== null && this.mouse.y !== null) {
        const screenMouseY = this.mouse.y - this.scrollY;
        const dx = p.x - this.mouse.x;
        const dy = p.y - screenMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          p.x += (dx / dist) * force * 2.2;
          p.y += (dy / dist) * force * 2.2;
        }
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha * baseAlpha;
      this.ctx.fill();

      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = p.color;
          this.ctx.globalAlpha = (1 - dist / 100) * 0.16 * baseAlpha;
          this.ctx.lineWidth = 0.8;
          this.ctx.stroke();
        }
      }
    }
    this.ctx.globalAlpha = 1.0;
  }

  drawNebula() {
    const time = Date.now() * 0.001 * this.speedFactor;
    const isDark = document.documentElement.classList.contains('dark');
    const alpha = isDark ? 0.2 : 0.1;

    const g1 = this.ctx.createRadialGradient(
      this.width * 0.3 + Math.sin(time * 0.4) * 80,
      this.height * 0.4 + Math.cos(time * 0.3) * 60,
      10,
      this.width * 0.3,
      this.height * 0.4,
      400
    );
    g1.addColorStop(0, this.accentColor);
    g1.addColorStop(1, 'transparent');

    const g2 = this.ctx.createRadialGradient(
      this.width * 0.7 + Math.cos(time * 0.5) * 90,
      this.height * 0.6 + Math.sin(time * 0.4) * 70,
      10,
      this.width * 0.7,
      this.height * 0.6,
      420
    );
    g2.addColorStop(0, this.secondaryColor);
    g2.addColorStop(1, 'transparent');

    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = g1;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = g2;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalAlpha = 1.0;
  }

  drawWaves() {
    const time = Date.now() * 0.0012 * this.speedFactor;
    this.ctx.globalAlpha = 0.12;
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.height * 0.5);
      for (let x = 0; x <= this.width; x += 25) {
        const y = this.height * 0.5 + Math.sin(x * 0.004 + time + i) * 50 + Math.cos(x * 0.002 + time * 0.7) * 35;
        this.ctx.lineTo(x, y);
      }
      this.ctx.strokeStyle = i % 2 === 0 ? this.accentColor : this.secondaryColor;
      this.ctx.lineWidth = 1.8;
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1.0;
  }
}

// FULL-BACKGROUND PHOTO SCROLL & PARALLAX ANIMATION ENGINE
class FullBackgroundAnimation {
  constructor() {
    this.bgPhoto = document.getElementById('full-bg-photo');
    this.targetScrollY = 0;
    this.currentScrollY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.currentMouseX = 0;
    this.currentMouseY = 0;
    this.baseOpacity = 0.55;
    this.baseBlur = 0;

    this.init();
  }

  init() {
    if (!this.bgPhoto) return;

    window.addEventListener('scroll', () => {
      this.targetScrollY = window.scrollY;
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      this.targetMouseX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      this.targetMouseY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    }, { passive: true });

    this.render();
  }

  updatePhoto(imageUrl, opacity = 0.55, blur = 0) {
    if (!this.bgPhoto) return;
    if (imageUrl) {
      this.bgPhoto.style.backgroundImage = `url("${imageUrl}")`;
    }
    this.baseOpacity = opacity;
    this.baseBlur = blur;
  }

  render() {
    // Smooth lerp for scroll and mouse
    this.currentScrollY += (this.targetScrollY - this.currentScrollY) * 0.085;
    this.currentMouseX += (this.targetMouseX - this.currentMouseX) * 0.05;
    this.currentMouseY += (this.targetMouseY - this.currentMouseY) * 0.05;

    if (this.bgPhoto) {
      // SCROLL-TRIGGERED ANIMATION EFFECTS:
      // 1. Smooth Parallax translation downwards
      const parallaxY = this.currentScrollY * 0.28;
      
      // 2. Dynamic Scale / Zoom expansion as page scrolls
      const zoomScale = 1.02 + Math.min(0.2, this.currentScrollY * 0.00025);

      // 3. Subtle interactive mouse tilt/pan
      const mousePanX = this.currentMouseX * 12;
      const mousePanY = this.currentMouseY * 10;

      // 4. Scroll-driven blur & depth adjustment
      const scrollBlur = Math.min(6, this.baseBlur + (this.currentScrollY > 300 ? (this.currentScrollY - 300) * 0.004 : 0));
      
      // 5. Scroll-driven opacity adjustment (lighter background)
      const dynamicOpacity = Math.max(0.38, this.baseOpacity - (this.currentScrollY * 0.0002));

      // Apply GPU-accelerated 3D transform
      this.bgPhoto.style.transform = `translate3d(${mousePanX}px, ${parallaxY + mousePanY}px, 0) scale(${zoomScale})`;
      this.bgPhoto.style.filter = `blur(${scrollBlur}px)`;
      this.bgPhoto.style.opacity = dynamicOpacity;
    }

    requestAnimationFrame(() => this.render());
  }
}

// Initialize on DOM load
let bgCanvasEngine = null;
let fullBgAnimation = null;

document.addEventListener('DOMContentLoaded', () => {
  bgCanvasEngine = new SmoothBackground();
  fullBgAnimation = new FullBackgroundAnimation();
});

window.SmoothBgEngine = {
  updateSettings: (settings) => {
    if (bgCanvasEngine) bgCanvasEngine.setSettings(settings);
    if (fullBgAnimation && settings) {
      fullBgAnimation.updatePhoto(
        settings.customImage,
        settings.overlayOpacity !== undefined ? settings.overlayOpacity : 0.75,
        settings.blur !== undefined ? settings.blur : 0
      );
    }
  }
};
