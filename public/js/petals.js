// ===== Falling Petals Particle System =====
const Petals = (() => {
  let canvas, ctx;
  let petals = [];
  let animationId = null;
  let isActive = false;

  const PETAL_COLORS = [
    '#F9A8D4', '#F472B6', '#FBCFE8', '#EC4899',
    '#FDF2F8', '#FDA4AF', '#FB7185'
  ];

  class Petal {
    constructor(burst = false) {
      this.reset(burst);
    }

    reset(burst = false) {
      this.x = Math.random() * canvas.width;
      this.y = burst ? (Math.random() * canvas.height * 0.3) : -20;
      this.size = 4 + Math.random() * 8;
      this.speedY = 0.5 + Math.random() * 1.5;
      this.speedX = (Math.random() - 0.5) * 1;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.04;
      this.wobbleAmp = 20 + Math.random() * 40;
      this.wobbleSpeed = 0.01 + Math.random() * 0.02;
      this.wobbleOffset = Math.random() * Math.PI * 2;
      this.opacity = 0.4 + Math.random() * 0.6;
      this.color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
      this.life = 0;
    }

    update() {
      this.life++;
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.life * this.wobbleSpeed + this.wobbleOffset) * 0.5;
      this.rotation += this.rotationSpeed;

      // Fade out near bottom
      if (this.y > canvas.height - 100) {
        this.opacity *= 0.98;
      }

      return this.y < canvas.height + 20 && this.opacity > 0.01;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = this.color;

      // Draw petal shape (teardrop)
      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.bezierCurveTo(
        this.size * 0.8, -this.size * 0.5,
        this.size * 0.6, this.size * 0.5,
        0, this.size
      );
      ctx.bezierCurveTo(
        -this.size * 0.6, this.size * 0.5,
        -this.size * 0.8, -this.size * 0.5,
        0, -this.size
      );
      ctx.fill();
      ctx.restore();
    }
  }

  function init() {
    canvas = document.getElementById('petal-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    petals = petals.filter(p => p.update());
    petals.forEach(p => p.draw());

    if (petals.length > 0) {
      animationId = requestAnimationFrame(animate);
    } else {
      isActive = false;
    }
  }

  // Burst of petals (triggered on new drop)
  function burst(count = 50) {
    for (let i = 0; i < count; i++) {
      petals.push(new Petal(true));
    }
    if (!isActive) {
      isActive = true;
      animate();
    }
  }

  // Gentle ambient petals
  function ambient(count = 15) {
    for (let i = 0; i < count; i++) {
      const p = new Petal(false);
      p.y = -20 - Math.random() * 200; // stagger start
      petals.push(p);
    }
    if (!isActive) {
      isActive = true;
      animate();
    }
  }

  return { init, burst, ambient };
})();
