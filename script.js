const textInput = document.getElementById('text-input');
const imageInput = document.getElementById('image-input');
const imagePreviews = document.getElementById('image-previews');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const itemCard = document.getElementById('item-card');
const resultOverlay = document.getElementById('result-overlay');
const winnerDisplay = document.getElementById('winner-display');
const closeResultBtn = document.getElementById('close-result');
const applauseSound = document.getElementById('applause-sound');
const confettiCanvas = document.createElement('canvas');

// Initialize Confetti Canvas
confettiCanvas.id = 'confetti-canvas';
confettiCanvas.style.position = 'fixed';
confettiCanvas.style.top = '0';
confettiCanvas.style.left = '0';
confettiCanvas.style.width = '100%';
confettiCanvas.style.height = '100%';
confettiCanvas.style.pointerEvents = 'none';
confettiCanvas.style.zIndex = '300';
document.body.appendChild(confettiCanvas);
const ctx = confettiCanvas.getContext('2d');
let particles = [];
let confettiAnimationId = null;

// Settings Elements
const toggleSettingsBtn = document.getElementById('toggle-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const settingsPanel = document.getElementById('settings-panel');
const speedSlider = document.getElementById('speed-slider');
const modeButtons = document.querySelectorAll('.btn-toggle');
const bgColorPicker = document.getElementById('bg-color-picker');
const textColorPicker = document.getElementById('text-color-picker');

let imageItems = [];
let isSpinning = false;
let isStopping = false;
let stopCounter = 0;
let spinTimeout = null;
let currentDelay = 0;
let currentItem = null;
let currentIndex = 0;

let settings = {
  speed: 440,
  mode: 'random',
  bgColor: '#0d0d12',
  textColor: '#ffffff'
};

// --- Initialization & LocalStorage ---
function loadData() {
  const savedSettings = localStorage.getItem('mousou_settings');
  if (savedSettings) {
    settings = { ...settings, ...JSON.parse(savedSettings) };
    applySettings();
  }

  const savedText = localStorage.getItem('mousou_text');
  if (savedText) {
    textInput.value = savedText;
  }
}

function saveSettings() {
  localStorage.setItem('mousou_settings', JSON.stringify(settings));
}

function applySettings() {
  speedSlider.value = settings.speed;
  modeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === settings.mode));
  bgColorPicker.value = settings.bgColor;
  textColorPicker.value = settings.textColor;
  document.documentElement.style.setProperty('--custom-bg', settings.bgColor);
  document.documentElement.style.setProperty('--custom-text', settings.textColor);
  updateButtonGradient(settings.textColor);
}

function updateButtonGradient(color) {
  const gradStart = color;
  const gradEnd = adjustColor(color, -40); // Slightly darker
  document.documentElement.style.setProperty('--btn-grad-start', gradStart);
  document.documentElement.style.setProperty('--btn-grad-end', gradEnd);
}

function adjustColor(hex, amount) {
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  r = Math.min(255, Math.max(0, r + amount));
  g = Math.min(255, Math.max(0, g + amount));
  b = Math.min(255, Math.max(0, b + amount));

  const rr = r.toString(16).padStart(2, '0');
  const gg = g.toString(16).padStart(2, '0');
  const bb = b.toString(16).padStart(2, '0');

  return `#${rr}${gg}${bb}`;
}

// --- Interaction ---
toggleSettingsBtn.addEventListener('click', () => settingsPanel.classList.toggle('open'));
closeSettingsBtn.addEventListener('click', () => settingsPanel.classList.remove('open'));

speedSlider.addEventListener('input', (e) => {
  settings.speed = parseInt(e.target.value);
  saveSettings();
});

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    settings.mode = btn.dataset.mode;
    applySettings();
    saveSettings();
  });
});

bgColorPicker.addEventListener('input', (e) => {
  settings.bgColor = e.target.value;
  document.documentElement.style.setProperty('--custom-bg', settings.bgColor);
  saveSettings();
});

textColorPicker.addEventListener('input', (e) => {
  settings.textColor = e.target.value;
  document.documentElement.style.setProperty('--custom-text', settings.textColor);
  updateButtonGradient(settings.textColor);
  saveSettings();
});

textInput.addEventListener('input', () => {
  localStorage.setItem('mousou_text', textInput.value);
});

// --- Image Handling ---
imageInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgData = event.target.result;
      imageItems.push({ type: 'image', value: imgData });
      
      const img = document.createElement('img');
      img.src = imgData;
      img.className = 'preview-item';
      imagePreviews.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

function getItems() {
  const textVal = textInput.value.trim();
  const textItems = textVal.split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => ({ type: 'text', value: s }));
  
  return [...textItems, ...imageItems];
}

function adjustFontSize(element) {
  const container = element.parentElement;
  if (!container) return;
  
  // Reset font size to measure
  const isWinner = element.classList.contains('winner-display') || container.id === 'winner-display';
  let fontSize = isWinner ? 120 : 80; // pixels approx (8rem/12rem)
  element.style.fontSize = fontSize + 'px';
  
  while (
    (element.scrollHeight > container.offsetHeight || element.scrollWidth > container.offsetWidth) &&
    fontSize > 20
  ) {
    fontSize -= 2;
    element.style.fontSize = fontSize + 'px';
  }
}

function updateDisplay(item, container) {
  if (!item) return;
  container.innerHTML = '';
  if (item.type === 'text') {
    const span = document.createElement('span');
    span.textContent = item.value;
    container.appendChild(span);
    // Use requestAnimationFrame to wait for layout
    requestAnimationFrame(() => adjustFontSize(span));
  } else {
    const img = document.createElement('img');
    img.src = item.value;
    container.appendChild(img);
  }
}

// --- Spin Logic ---
function startSpin() {
  const allItems = getItems();
  if (allItems.length === 0) {
    alert('設定パネルを開いて項目を入力してください');
    settingsPanel.classList.add('open');
    return;
  }

  isSpinning = true;
  isStopping = false;
  startBtn.style.display = 'none';
  stopBtn.style.display = 'block';
  settingsPanel.classList.remove('open');

  if (settings.mode === 'sequential') currentIndex = 0;

  currentDelay = 520 - settings.speed;
  spinLoop();
}

function spinLoop() {
  if (!isSpinning) return;

  const allItems = getItems();
  if (settings.mode === 'random') {
    currentItem = allItems[Math.floor(Math.random() * allItems.length)];
  } else {
    currentItem = allItems[currentIndex];
    currentIndex = (currentIndex + 1) % allItems.length;
  }
  
  updateDisplay(currentItem, itemCard);
  
  itemCard.classList.add('flicker');
  setTimeout(() => itemCard.classList.remove('flicker'), currentDelay / 2);

  if (isStopping) {
    // Deceleration: slow down gradually
    // Increase delay by a factor (e.g., 1.2x) or fixed amount
    currentDelay *= 1.25; 
    stopCounter--;
    
    if (stopCounter <= 0) {
      finishSpin();
      return;
    }
  } else {
    currentDelay = 520 - settings.speed;
  }

  spinTimeout = setTimeout(spinLoop, currentDelay);
}

function stopSpin() {
  if (!isSpinning || isStopping) return;
  isStopping = true;
  // Around 10-15 steps of deceleration feels like ~2 seconds
  stopCounter = 12; 
}

function finishSpin() {
  clearTimeout(spinTimeout);
  isSpinning = false;
  isStopping = false;
  setTimeout(() => showResult(currentItem), 500);
}

function showResult(item) {
  winnerDisplay.innerHTML = '';
  updateDisplay(item, winnerDisplay);
  
  applauseSound.currentTime = 0;
  applauseSound.play().catch(e => console.log("Sound failed:", e));
  
  resultOverlay.style.display = 'flex';
  startConfetti();

  // Notify remote
  if (conn && conn.open) {
    conn.send('show_ok');
  }
}

// --- Confetti Animation ---
function startConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  particles = [];
  const colors = ['#ff3d71', '#ff9e00', '#3366ff', '#00d68f', '#ffffff'];
  
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 150,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngleIncremental: Math.random() * 0.07 + 0.05,
      tiltAngle: 0
    });
  }
  
  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  animateConfetti();
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let finished = true;
  
  particles.forEach(p => {
    p.tiltAngle += p.tiltAngleIncremental;
    p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
    p.x += Math.sin(p.d);
    p.tilt = Math.sin(p.tiltAngle) * 15;
    
    if (p.y <= confettiCanvas.height) finished = false;
    
    ctx.beginPath();
    ctx.lineWidth = p.r;
    ctx.strokeStyle = p.color;
    ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
    ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
    ctx.stroke();
  });
  
  if (!finished) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  }
}

function stopConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

startBtn.addEventListener('click', startSpin);
stopBtn.addEventListener('click', stopSpin);

resetBtn.addEventListener('click', () => {
  if (confirm('全ての項目と設定をクリアしますか？')) {
    localStorage.clear();
    location.reload();
  }
});

function closeResult() {
  resultOverlay.style.display = 'none';
  startBtn.style.display = 'block';
  stopBtn.style.display = 'none';
  stopConfetti();

  // Notify remote
  if (conn && conn.open) {
    conn.send('reset');
  }
}

closeResultBtn.addEventListener('click', closeResult);

// Init
loadData();
const initialItems = getItems();
if (initialItems.length > 0) updateDisplay(initialItems[0], itemCard);

// --- PeerJS Remote Control Logic ---
let peer = null;
let conn = null;

const qrModal = document.getElementById('qr-modal');
const showQrBtn = document.getElementById('show-qr-btn');
const closeQrBtn = document.getElementById('close-qr');
const qrcodeContainer = document.getElementById('qrcode-container');
const remoteStatus = document.getElementById('remote-status');
const remoteConnectionInfo = document.getElementById('remote-connection-info');

const remoteControllerView = document.getElementById('remote-controller-view');
const remoteStartBtn = document.getElementById('remote-start-btn');
const remoteStopBtn = document.getElementById('remote-stop-btn');
const remoteOkBtn = document.getElementById('remote-ok-btn');
const remoteExitBtn = document.getElementById('remote-exit-btn');
const remoteSyncStatus = document.getElementById('remote-sync-status');

// Initialize based on URL parameters
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode');
const peerIdParam = urlParams.get('peer');

if (mode === 'remote' && peerIdParam) {
  initRemoteMode(peerIdParam);
} else {
  initHostMode();
}

function initHostMode() {
  // lazy init peer only when needed or on load
  peer = new Peer();
  
  peer.on('open', (id) => {
    console.log('Host Peer ID:', id);
  });

  peer.on('connection', (connection) => {
    conn = connection;
    setupHostConnection();
  });

  showQrBtn.addEventListener('click', () => {
    if (!peer.id) {
      alert('通信の初期化中です。少々お待ちください。');
      return;
    }
    
    // Clear previous QR code
    qrcodeContainer.innerHTML = '';
    
    // Generate URL for remote
    const remoteUrl = `${window.location.origin}${window.location.pathname}?mode=remote&peer=${peer.id}`;
    
    new QRCode(qrcodeContainer, {
      text: remoteUrl,
      width: 256,
      height: 256
    });
    
    qrModal.style.display = 'flex';
  });

  closeQrBtn.addEventListener('click', () => {
    qrModal.style.display = 'none';
  });
}

function setupHostConnection() {
  remoteStatus.textContent = '接続済み';
  remoteStatus.classList.add('connected');
  remoteConnectionInfo.textContent = 'iPhoneと接続されました！';
  
  setTimeout(() => {
    qrModal.style.display = 'none';
  }, 1500);

  conn.on('data', (data) => {
    if (data === 'start') {
      if (resultOverlay.style.display === 'flex') {
        closeResult();
      }
      if (!isSpinning) startSpin();
    } else if (data === 'stop') {
      if (isSpinning && !isStopping) stopSpin();
    } else if (data === 'close_result') {
      closeResult();
    }
  });

  conn.on('close', () => {
    remoteStatus.textContent = '未接続';
    remoteStatus.classList.remove('connected');
    remoteConnectionInfo.textContent = '接続が蓄機中...';
  });
}

function initRemoteMode(targetId) {
  document.body.classList.add('remote-mode');
  peer = new Peer();
  
  peer.on('open', () => {
    conn = peer.connect(targetId);
    
    conn.on('open', () => {
      remoteSyncStatus.textContent = '接続完了 - 準備OK';
      remoteSyncStatus.style.color = '#00d68f';
    });
    
    conn.on('data', (data) => {
      if (data === 'show_ok') {
        remoteStartBtn.style.display = 'none';
        remoteStopBtn.style.display = 'none';
        remoteOkBtn.style.display = 'flex';
      } else if (data === 'reset') {
        remoteStartBtn.style.display = 'flex';
        remoteStopBtn.style.display = 'none';
        remoteOkBtn.style.display = 'none';
      }
    });

    conn.on('error', (err) => {
      remoteSyncStatus.textContent = '接続エラー';
      remoteSyncStatus.style.color = '#ff3d71';
    });
  });

  remoteStartBtn.addEventListener('click', () => {
    if (conn && conn.open) {
      conn.send('start');
      remoteStartBtn.style.display = 'none';
      remoteStopBtn.style.display = 'flex';
    }
  });

  remoteStopBtn.addEventListener('click', () => {
    if (conn && conn.open) {
      conn.send('stop');
      remoteStopBtn.style.display = 'none';
      remoteStartBtn.style.display = 'flex';
    }
  });

  remoteOkBtn.addEventListener('click', () => {
    if (conn && conn.open) {
      conn.send('close_result');
      // Optimistic UI toggle
      remoteOkBtn.style.display = 'none';
      remoteStartBtn.style.display = 'flex';
    }
  });

  remoteExitBtn.addEventListener('click', () => {
    if (confirm('リモコンモードを終了しますか？')) {
      window.location.href = window.location.pathname;
    }
  });
}

// Sync button states even on remote
// This is a bit limited since we don't have bi-directional sync easily without more complexity
// But we can reset buttons when result closes if we wanted to.
// Focusing on basic start/stop for now.
