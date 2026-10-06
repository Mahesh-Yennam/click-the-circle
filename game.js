/* ==========================================================================
   Click the Circle - Modern Arcade Game Engine
   ========================================================================== */

(function () {
  'use strict';

  // --- Game State Variables ---
  let score = 0;
  let time = 30;
  const GAME_DURATION = 30;
  let highScore = Number(localStorage.getItem('highScore')) || 0;
  let gameRunning = false;
  let timer = null;
  let circleSize = 50;

  // Streak & Performance Tracking
  let streak = 0;
  let maxStreak = 0;
  let lastClickTime = 0;
  let soundEnabled = localStorage.getItem('soundEnabled') !== 'false'; // default true

  // --- DOM Elements ---
  const game = document.getElementById('game');
  const circle = document.getElementById('circle');
  const fxCanvas = document.getElementById('fxCanvas');
  const floaters = document.getElementById('floaters');
  const startOverlay = document.getElementById('startOverlay');

  const scoreText = document.getElementById('score');
  const timeText = document.getElementById('time');
  const highScoreText = document.getElementById('highScore');
  const streakVal = document.getElementById('streakVal');
  const timerBar = document.getElementById('timerBar');

  const cardTime = document.getElementById('cardTime');
  const cardScore = document.getElementById('cardScore');

  const startButton = document.getElementById('startButton');
  const startBtnText = document.getElementById('startBtnText');
  const restartButton = document.getElementById('restartButton');
  const shareButton = document.getElementById('shareButton');
  const soundToggle = document.getElementById('soundToggle');
  const soundIconOn = document.getElementById('soundIconOn');
  const soundIconOff = document.getElementById('soundIconOff');

  const message = document.getElementById('message');
  const toast = document.getElementById('toast');

  const gameOver = document.getElementById('gameOver');
  const finalScore = document.getElementById('finalScore');
  const cpsStat = document.getElementById('cpsStat');
  const maxStreakStat = document.getElementById('maxStreakStat');
  const modalHighScore = document.getElementById('modalHighScore');
  const rankBadge = document.getElementById('rankBadge');
  const modalBadgeIcon = document.getElementById('modalBadgeIcon');

  // --- Canvas Particle System ---
  let ctx = null;
  let particles = [];
  let animFrameId = null;

  if (fxCanvas) {
    ctx = fxCanvas.getContext('2d');
    function resizeCanvas() {
      if (!game || !fxCanvas) return;
      const rect = game.getBoundingClientRect();
      fxCanvas.width = rect.width;
      fxCanvas.height = rect.height;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  }

  // --- Audio Synthesis via Web Audio API ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.08, volume = 0.2) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio fallback fail silently
    }
  }

  function playHitSound(currentStreak) {
    if (!soundEnabled) return;
    initAudio();
    // Pitch increases with combo streak
    const baseFreq = 440;
    const freq = Math.min(1000, baseFreq + currentStreak * 28);
    playTone(freq, 'triangle', 0.09, 0.22);
  }

  function playTickSound() {
    if (!soundEnabled) return;
    initAudio();
    playTone(880, 'sine', 0.04, 0.15);
  }

  function playCelebrationFanfare() {
    if (!soundEnabled) return;
    initAudio();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 'triangle', 0.2, 0.2);
      }, idx * 100);
    });
  }

  function playGameOverSound() {
    if (!soundEnabled) return;
    initAudio();
    const notes = [440, 392, 349.23, 261.63];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 'sine', 0.18, 0.15);
      }, idx * 120);
    });
  }

  // --- Sound Toggle Handling ---
  function updateSoundUI() {
    if (soundEnabled) {
      soundIconOn.classList.remove('hidden');
      soundIconOff.classList.add('hidden');
      soundToggle.setAttribute('aria-label', 'Sound On');
    } else {
      soundIconOn.classList.add('hidden');
      soundIconOff.classList.remove('hidden');
      soundToggle.setAttribute('aria-label', 'Sound Muted');
    }
  }

  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('soundEnabled', soundEnabled);
      updateSoundUI();
      if (soundEnabled) {
        initAudio();
        playTone(660, 'sine', 0.1, 0.18);
        showToast('Sound enabled 🔊');
      } else {
        showToast('Sound muted 🔇');
      }
    });
  }
  updateSoundUI();

  // --- Toast Notifications ---
  let toastTimer = null;
  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // --- Initial Display ---
  highScoreText.textContent = highScore;
  circle.style.display = 'none';
  gameOver.style.display = 'none';

  // --- Particles Animation Loop ---
  function spawnParticles(x, y, count = 14, colorOverride = null) {
    if (!ctx) return;
    const colors = colorOverride || ['#ff4d6d', '#f43f5e', '#ec4899', '#38bdf8', '#818cf8', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 2;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.025 + 0.02
      });
    }
  }

  function spawnConfetti() {
    if (!ctx || !game) return;
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];
    const w = game.clientWidth;
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * 20,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.012 + 0.008
      });
    }
  }

  function renderParticles() {
    if (!ctx || !fxCanvas) return;
    ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // subtle gravity
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    animFrameId = requestAnimationFrame(renderParticles);
  }
  renderParticles();

  // --- Floating +1 text score ---
  function createFloatingText(x, y, text, isCombo = false) {
    if (!floaters) return;
    const floater = document.createElement('div');
    floater.className = 'floating-score' + (isCombo ? ' combo-bonus' : '');
    floater.textContent = text;
    floater.style.left = x + 'px';
    floater.style.top = y + 'px';
    floaters.appendChild(floater);

    setTimeout(() => {
      if (floater.parentNode) {
        floater.parentNode.removeChild(floater);
      }
    }, 700);
  }

  // --- Start Game ---
  function startGame() {
    initAudio();
    score = 0;
    time = GAME_DURATION;
    streak = 0;
    maxStreak = 0;
    lastClickTime = Date.now();
    circleSize = 52;
    gameRunning = true;

    // Google Analytics
    if (typeof gtag === 'function') {
      try {
        gtag('event', 'game_start');
      } catch (e) {}
    }

    // Reset UI
    scoreText.textContent = score;
    timeText.textContent = time;
    streakVal.textContent = '0x';
    timerBar.style.width = '100%';
    cardTime.classList.remove('time-danger');

    // Hide Start Overlay & Game Over Modal
    if (startOverlay) startOverlay.style.display = 'none';
    gameOver.style.display = 'none';

    // Reset and position target circle
    circle.style.width = circleSize + 'px';
    circle.style.height = circleSize + 'px';
    circle.style.display = 'block';

    message.innerHTML = '⚡ Hit the target as fast as you can!';
    startButton.disabled = true;
    startBtnText.textContent = 'Game In Progress';

    moveCircle();

    // Clear old timer if any
    clearInterval(timer);

    timer = setInterval(function () {
      time--;
      timeText.textContent = time;

      // Progress bar fill percentage
      const pct = (time / GAME_DURATION) * 100;
      timerBar.style.width = Math.max(0, pct) + '%';

      // Last 5 seconds warning pulse & sound
      if (time <= 5 && time > 0) {
        cardTime.classList.add('time-danger');
        playTickSound();
      }

      if (time <= 0) {
        endGame();
      }
    }, 1000);
  }

  // --- End Game ---
  function endGame() {
    gameRunning = false;
    clearInterval(timer);

    // Google Analytics
    if (typeof gtag === 'function') {
      try {
        gtag('event', 'game_over', { score: score });
      } catch (e) {}
    }

    // Hide Target
    circle.style.display = 'none';
    cardTime.classList.remove('time-danger');
    timerBar.style.width = '0%';

    startButton.disabled = false;
    startBtnText.textContent = 'Start Game';

    // Calculate Final Performance Stats
    const cps = (score / GAME_DURATION).toFixed(1);
    finalScore.textContent = score;
    cpsStat.textContent = cps;
    maxStreakStat.textContent = maxStreak + 'x';

    // Rank Tier calculation
    let rankTitle = '🥉 REFLEX ROOKIE';
    let icon = '🎯';

    if (score >= 45) {
      rankTitle = '👑 GODLIKE REFLEXES';
      icon = '⚡';
    } else if (score >= 35) {
      rankTitle = '🔥 LIGHTNING SHARPSHOOTER';
      icon = '🌟';
    } else if (score >= 25) {
      rankTitle = '🥇 SPEED DEMON';
      icon = '🏆';
    } else if (score >= 15) {
      rankTitle = '🥈 SWIFT CLICKER';
      icon = '💫';
    }

    rankBadge.textContent = rankTitle;
    modalBadgeIcon.textContent = icon;

    // Check High Score
    const isNewHigh = score > highScore;
    if (isNewHigh) {
      highScore = score;
      highScoreText.textContent = highScore;
      localStorage.setItem('highScore', highScore);

      if (typeof gtag === 'function') {
        try {
          gtag('event', 'new_high_score', { score: score });
        } catch (e) {}
      }

      rankBadge.textContent = '🎉 NEW ALL-TIME RECORD! 🎉';
      modalBadgeIcon.textContent = '👑';
      spawnConfetti();
      playCelebrationFanfare();
      showToast('🏆 New Personal Best!');
    } else {
      playGameOverSound();
    }

    modalHighScore.textContent = highScore;

    // Show Game Over screen
    gameOver.style.display = 'flex';
    message.textContent = 'Trial finished! Can you beat your best score?';
  }

  // --- Move Circle with Boundary Clamping ---
  function moveCircle() {
    if (!game) return;
    const maxX = Math.max(10, game.clientWidth - circleSize - 10);
    const maxY = Math.max(10, game.clientHeight - circleSize - 10);

    const randomX = Math.floor(Math.random() * maxX) + 5;
    const randomY = Math.floor(Math.random() * maxY) + 5;

    circle.style.left = randomX + 'px';
    circle.style.top = randomY + 'px';
  }

  // --- Circle Hit Handler ---
  function handleCircleHit(e) {
    if (!gameRunning) return;

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const now = Date.now();
    const timeDelta = now - lastClickTime;
    lastClickTime = now;

    // Streak logic: rapid clicks within 1.2s build combos
    if (timeDelta < 1200) {
      streak++;
    } else {
      streak = 1;
    }
    if (streak > maxStreak) {
      maxStreak = streak;
    }

    score++;

    // Pulse value animations
    scoreText.textContent = score;
    streakVal.textContent = streak + 'x';
    cardScore.querySelector('.stat-value').classList.add('pulse-val');
    setTimeout(() => {
      cardScore.querySelector('.stat-value').classList.remove('pulse-val');
    }, 120);

    // Audio cue
    playHitSound(streak);

    // Circle coordinate in arena
    const circleRect = circle.getBoundingClientRect();
    const arenaRect = game.getBoundingClientRect();
    const centerX = circleRect.left - arenaRect.left + circleSize / 2;
    const centerY = circleRect.top - arenaRect.top + circleSize / 2;

    // Particle Burst
    spawnParticles(centerX, centerY, 14);

    // Floating text feedback
    if (streak >= 4 && streak % 2 === 0) {
      createFloatingText(centerX, centerY, `+1 🔥 ${streak}x`, true);
    } else {
      createFloatingText(centerX, centerY, '+1', false);
    }

    // Difficulty curve: shrinking circle down to min 24px
    circleSize = Math.max(24, Math.floor(52 - score * 0.65));
    circle.style.width = circleSize + 'px';
    circle.style.height = circleSize + 'px';

    // Click pop animation
    circle.classList.add('clicked');
    setTimeout(function () {
      circle.classList.remove('clicked');
    }, 90);

    // Reposition target
    moveCircle();
  }

  // --- Event Listeners ---

  // Start & Restart buttons
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);

  // Clicking idle overlay inside arena starts immediately
  if (startOverlay) {
    startOverlay.addEventListener('click', () => {
      if (!gameRunning) startGame();
    });
  }

  // Target pointer events for responsive mobile and desktop hit reaction
  circle.addEventListener('pointerdown', handleCircleHit);

  // Arena miss / streak reset
  game.addEventListener('pointerdown', (e) => {
    if (!gameRunning) return;
    if (e.target === circle || circle.contains(e.target)) return;
    // Streak breaks on miss
    streak = 0;
    streakVal.textContent = '0x';
  });

  // Keyboard shortcut: Spacebar to start or restart
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && (e.target === document.body || e.target === game)) {
      e.preventDefault();
      if (!gameRunning) {
        startGame();
      }
    }
  });

  // --- Share Score Feature ---
  if (shareButton) {
    shareButton.addEventListener('click', async () => {
      // Use live website URL if running locally or from file://
      const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const shareUrl = isLocal ? 'https://mahesh-yennam.github.io/click-the-circle/' : window.location.href;
      const shareText = `🎯 I scored ${score} points in Click the Circle with ${cpsStat.textContent} CPS and a ${maxStreak}x streak! Can you beat me?`;
      const fullCopyText = `${shareText}\nPlay here: ${shareUrl}`;

      // 1. Mobile Native Web Share API (WhatsApp, Messages, Twitter, etc.)
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Click the Circle - High Score',
            text: shareText,
            url: shareUrl
          });
          return;
        } catch (err) {
          // If user cancels or share fails, fallback to clipboard copy
          if (err.name === 'AbortError') return;
        }
      }

      // 2. Modern Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(fullCopyText);
          showToast('📋 Score copied to clipboard!');
          return;
        } catch (err) {
          // Clipboard API may be denied in some iframe / non-secure contexts
        }
      }

      // 3. Robust legacy fallback (works on file:/// and older browsers)
      try {
        const tempInput = document.createElement('textarea');
        tempInput.value = fullCopyText;
        tempInput.style.position = 'fixed';
        tempInput.style.left = '-9999px';
        tempInput.style.top = '-9999px';
        document.body.appendChild(tempInput);
        tempInput.focus();
        tempInput.select();
        const success = document.execCommand('copy');
        document.body.removeChild(tempInput);

        if (success) {
          showToast('📋 Score copied to clipboard!');
        } else {
          showToast('Unable to copy score');
        }
      } catch (err) {
        showToast('Unable to copy score');
      }
    });
  }

})();
