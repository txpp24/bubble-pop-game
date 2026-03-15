const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
const BUBBLE_SIZE = 50;
const BASE_BUBBLE_COUNT = 20;
const BASE_TIME = 60;
const BOMB_CHANCE = 0.05;
const POWERUP_CHANCE = 0.08;

const API_BASE_URL = 'http://localhost:3000/api';

const POWERUPS = {
    ADD_TIME: { icon: '⏰', color: '#FFD700', effect: 'addTime', value: 10, name: '增加时间' },
    REDUCE_TIME: { icon: '⚡', color: '#FF4444', effect: 'reduceTime', value: 5, name: '减少时间' },
    DOUBLE_SCORE: { icon: '✨', color: '#FF69B4', effect: 'doubleScore', value: 0, name: '双倍分数' },
    FREEZE: { icon: '❄️', color: '#87CEEB', effect: 'freeze', value: 3, name: '冻结气泡' },
    BOMB_ALL: { icon: '💥', color: '#FF4500', effect: 'bombAll', value: 0, name: '全屏炸弹' }
};

let gameState = {
    mode: null,
    level: 1,
    score: 0,
    timeLeft: BASE_TIME,
    bubbleCount: BASE_BUBBLE_COUNT,
    bubbles: [],
    isPlaying: false,
    isPaused: false,
    combo: 1,
    maxCombo: 1,
    comboTimer: null,
    soundEnabled: true,
    timerInterval: null,
    bubbleInterval: null,
    doubleScoreActive: false,
    freezeActive: false,
    freezeTimer: null,
    user: null,
    token: null,
    scoreSubmitted: false
};

function calculateLevelDifficulty(level) {
    let bubbleCount, time;

    if (level <= 5) {
        bubbleCount = 20 + (level - 1) * 2;
        time = 60 - (level - 1) * 2;
    } else if (level <= 10) {
        bubbleCount = 28 + (level - 5) * 3;
        time = 52 - (level - 5) * 3;
    } else {
        bubbleCount = 43 + (level - 10) * 5;
        time = 37 - (level - 10) * 5;
    }

    time = Math.max(30, time);

    return { bubbleCount, time };
}

function saveGameState() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

function loadGameState() {
    const saved = localStorage.getItem('gameState');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameState.mode = parsed.mode;
        gameState.level = parsed.level || 1;
        gameState.score = parsed.score;
        gameState.timeLeft = parsed.timeLeft;
        gameState.bubbleCount = parsed.bubbleCount || BASE_BUBBLE_COUNT;
        gameState.isPlaying = parsed.isPlaying;
        gameState.isPaused = parsed.isPaused;
        gameState.combo = parsed.combo;
        gameState.maxCombo = parsed.maxCombo;
    }
}

const bubbleContainer = document.getElementById('bubble-container');
const levelDisplay = document.getElementById('level-display');
const timerDisplay = document.getElementById('timer-display');
const scoreDisplay = document.getElementById('score-display');
const comboDisplay = document.getElementById('combo-display');
const finalScoreDisplay = document.getElementById('final-score');
const maxComboDisplay = document.getElementById('max-combo');
const soundToggleBtn = document.getElementById('sound-toggle');
const pauseOverlay = document.getElementById('pause-overlay');
const levelSuccessOverlay = document.getElementById('level-success-overlay');

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playPopSound(colorIndex) {
    if (!gameState.soundEnabled) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies = [600, 700, 800, 900, 1000, 1100];
    const baseFreq = frequencies[colorIndex] || 800;

    oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, audioContext.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
}

function playBombSound() {
    if (!gameState.soundEnabled) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();

    oscillator.connect(gainNode);
    oscillator2.connect(gainNode2);
    gainNode.connect(audioContext.destination);
    gainNode2.connect(audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator2.type = 'square';

    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);

    oscillator2.frequency.setValueAtTime(100, audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    oscillator2.start(audioContext.currentTime);
    oscillator2.stop(audioContext.currentTime + 0.3);
}

function triggerVibration() {
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

function playCountdownSound() {
    if (!gameState.soundEnabled) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
}

function playFailSound() {
    if (!gameState.soundEnabled) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function playComboSound(combo) {
    if (!gameState.soundEnabled) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const baseFreq = 600 + combo * 100;
    oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(baseFreq, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
}

function createBubble(x, y, isBomb = false, powerupType = null) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const colorIndex = Math.floor(Math.random() * COLORS.length);
    const color = COLORS[colorIndex];
    const size = BUBBLE_SIZE + Math.random() * 10 - 5;

    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.backgroundColor = color;
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
    bubble.dataset.color = color;
    bubble.dataset.colorIndex = colorIndex;
    bubble.dataset.id = Date.now() + Math.random();
    bubble.dataset.vx = (Math.random() - 0.5) * 2;
    bubble.dataset.vy = (Math.random() - 0.5) * 2;
    bubble.dataset.isBomb = isBomb;
    bubble.dataset.powerup = powerupType || '';
    bubble.style.display = 'flex';
    bubble.style.alignItems = 'center';
    bubble.style.justifyContent = 'center';

    if (isBomb) {
        bubble.style.background = 'radial-gradient(circle, #FFD700 0%, #FFA500 100%)';
        bubble.innerHTML = '💣';
        bubble.style.fontSize = '24px';
    } else if (powerupType) {
        const powerup = POWERUPS[powerupType];
        bubble.style.background = `radial-gradient(circle, ${powerup.color} 0%, ${powerup.color}88 100%)`;
        bubble.innerHTML = powerup.icon;
        bubble.style.fontSize = '24px';
        bubble.classList.add('powerup-bubble');
    }

    bubble.addEventListener('click', () => handleBubbleClick(bubble));

    return bubble;
}

function generateBubbles() {
    const containerWidth = bubbleContainer.offsetWidth;
    const containerHeight = bubbleContainer.offsetHeight;

    for (let i = 0; i < gameState.bubbleCount; i++) {
        const x = Math.random() * (containerWidth - BUBBLE_SIZE);
        const y = Math.random() * (containerHeight - BUBBLE_SIZE);
        const isBomb = Math.random() < BOMB_CHANCE;
        let powerupType = null;

        if (!isBomb && Math.random() < POWERUP_CHANCE) {
            let powerupKeys = Object.keys(POWERUPS);

            if (gameState.mode === 'timed') {
                powerupKeys = powerupKeys.filter(key => key !== 'BOMB_ALL');
            }

            powerupType = powerupKeys[Math.floor(Math.random() * powerupKeys.length)];
        }

        const bubble = createBubble(x, y, isBomb, powerupType);
        bubbleContainer.appendChild(bubble);
        gameState.bubbles.push(bubble);
    }
}

function animateBubbles() {
    if (!gameState.isPlaying) return;

    const containerWidth = bubbleContainer.offsetWidth;
    const containerHeight = bubbleContainer.offsetHeight;

    gameState.bubbles.forEach(bubble => {
        let x = parseFloat(bubble.style.left);
        let y = parseFloat(bubble.style.top);
        let vx = parseFloat(bubble.dataset.vx);
        let vy = parseFloat(bubble.dataset.vy);

        x += vx;
        y += vy;

        if (x <= 0 || x >= containerWidth - BUBBLE_SIZE) {
            vx = -vx;
            bubble.dataset.vx = vx;
        }

        if (y <= 0 || y >= containerHeight - BUBBLE_SIZE) {
            vy = -vy;
            bubble.dataset.vy = vy;
        }

        x = Math.max(0, Math.min(x, containerWidth - BUBBLE_SIZE));
        y = Math.max(0, Math.min(y, containerHeight - BUBBLE_SIZE));

        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';
    });

    requestAnimationFrame(animateBubbles);
}

function getAdjacentBubbles(bubble) {
    const bubbleRect = bubble.getBoundingClientRect();
    const bubbleCenterX = bubbleRect.left + bubbleRect.width / 2;
    const bubbleCenterY = bubbleRect.top + bubbleRect.height / 2;
    const bubbleColor = bubble.dataset.color;
    const threshold = BUBBLE_SIZE * 1.2;

    const adjacentBubbles = [];

    gameState.bubbles.forEach(otherBubble => {
        if (otherBubble === bubble) return;

        const otherRect = otherBubble.getBoundingClientRect();
        const otherCenterX = otherRect.left + otherRect.width / 2;
        const otherCenterY = otherRect.top + otherRect.height / 2;

        const distance = Math.sqrt(
            Math.pow(bubbleCenterX - otherCenterX, 2) +
            Math.pow(bubbleCenterY - otherCenterY, 2)
        );

        if (distance <= threshold && otherBubble.dataset.color === bubbleColor) {
            adjacentBubbles.push(otherBubble);
        }
    });

    return adjacentBubbles;
}

function findAllConnectedBubbles(bubble, visited = new Set()) {
    if (visited.has(bubble.dataset.id)) return [];

    visited.add(bubble.dataset.id);
    const connectedBubbles = [bubble];
    const adjacentBubbles = getAdjacentBubbles(bubble);

    adjacentBubbles.forEach(adjacentBubble => {
        const moreConnected = findAllConnectedBubbles(adjacentBubble, visited);
        connectedBubbles.push(...moreConnected);
    });

    return connectedBubbles;
}

function handleBubbleClick(bubble) {
    if (!gameState.isPlaying || gameState.isPaused) return;

    let bubblesToRemove = [];
    const isBomb = bubble.dataset.isBomb === 'true';
    const powerupType = bubble.dataset.powerup;

    if (powerupType) {
        activatePowerup(powerupType, bubble);
        return;
    }

    if (isBomb) {
        playBombSound();
        triggerVibration();

        const bombRect = bubble.getBoundingClientRect();
        const bombCenterX = bombRect.left + bombRect.width / 2;
        const bombCenterY = bombRect.top + bombRect.height / 2;
        const explosionRadius = BUBBLE_SIZE * 2.5;

        gameState.bubbles.forEach(otherBubble => {
            const otherRect = otherBubble.getBoundingClientRect();
            const otherCenterX = otherRect.left + otherRect.width / 2;
            const otherCenterY = otherRect.top + otherRect.height / 2;

            const distance = Math.sqrt(
                Math.pow(bombCenterX - otherCenterX, 2) +
                Math.pow(bombCenterY - otherCenterY, 2)
            );

            if (distance <= explosionRadius) {
                bubblesToRemove.push(otherBubble);
            }
        });
    } else {
        const colorIndex = parseInt(bubble.dataset.colorIndex) || 0;
        bubblesToRemove = findAllConnectedBubbles(bubble);
        bubblesToRemove.forEach(b => {
            playPopSound(colorIndex);
        });
    }

    bubblesToRemove.forEach(b => {
        b.classList.add('pop');
    });

    const comboMultiplier = gameState.combo;
    let points = bubblesToRemove.length * comboMultiplier;

    if (gameState.doubleScoreActive) {
        points *= 2;
    }

    gameState.score += points;
    gameState.combo++;

    if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
    }

    updateScoreDisplay();
    updateComboDisplay();
    playComboSound(gameState.combo);

    showScorePopup(bubble, points);

    if (gameState.comboTimer) {
        clearTimeout(gameState.comboTimer);
    }
    gameState.comboTimer = setTimeout(() => {
        gameState.combo = 1;
        updateComboDisplay();
    }, 2000);

    setTimeout(() => {
        bubblesToRemove.forEach(b => {
            b.remove();
            gameState.bubbles = gameState.bubbles.filter(bubble => bubble !== b);
        });

        if (gameState.mode === 'endless') {
            generateNewBubbles(bubblesToRemove.length);
        }

        if (gameState.bubbles.length === 0) {
            if (gameState.mode === 'timed') {
                endGame(true);
            } else {
                generateNewBubbles(5);
            }
        }
    }, 300);
}

function showScorePopup(bubble, points) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '+' + points;

    const bubbleRect = bubble.getBoundingClientRect();
    const containerRect = bubbleContainer.getBoundingClientRect();

    popup.style.left = (bubbleRect.left - containerRect.left + bubbleRect.width / 2 - 20) + 'px';
    popup.style.top = (bubbleRect.top - containerRect.top) + 'px';

    bubbleContainer.appendChild(popup);

    setTimeout(() => {
        popup.remove();
    }, 1000);
}

function generateNewBubbles(count) {
    const containerWidth = bubbleContainer.offsetWidth;
    const containerHeight = bubbleContainer.offsetHeight;

    for (let i = 0; i < count; i++) {
        const x = Math.random() * (containerWidth - BUBBLE_SIZE);
        const y = Math.random() * (containerHeight - BUBBLE_SIZE);
        const isBomb = Math.random() < BOMB_CHANCE;
        let powerupType = null;

        if (!isBomb && Math.random() < POWERUP_CHANCE) {
            let powerupKeys = Object.keys(POWERUPS);

            if (gameState.mode === 'timed') {
                powerupKeys = powerupKeys.filter(key => key !== 'BOMB_ALL');
            }

            powerupType = powerupKeys[Math.floor(Math.random() * powerupKeys.length)];
        }

        const bubble = createBubble(x, y, isBomb, powerupType);
        bubbleContainer.appendChild(bubble);
        gameState.bubbles.push(bubble);
    }
}

function activatePowerup(powerupType, bubble) {
    const powerup = POWERUPS[powerupType];
    playPowerupSound();

    bubble.classList.add('pop');
    showPowerupPopup(bubble, powerup.name);

    setTimeout(() => {
        bubble.remove();
        gameState.bubbles = gameState.bubbles.filter(b => b !== bubble);

        switch (powerup.effect) {
            case 'addTime':
                gameState.timeLeft += powerup.value;
                updateTimerDisplay();
                break;
            case 'reduceTime':
                gameState.timeLeft = Math.max(0, gameState.timeLeft - powerup.value);
                updateTimerDisplay();
                break;
            case 'doubleScore':
                gameState.doubleScoreActive = true;
                setTimeout(() => {
                    gameState.doubleScoreActive = false;
                }, 10000);
                break;
            case 'freeze':
                gameState.freezeActive = true;
                gameState.bubbles.forEach(b => {
                    b.style.transition = 'none';
                });
                if (gameState.freezeTimer) {
                    clearTimeout(gameState.freezeTimer);
                }
                gameState.freezeTimer = setTimeout(() => {
                    gameState.freezeActive = false;
                    gameState.bubbles.forEach(b => {
                        b.style.transition = '';
                    });
                }, powerup.value * 1000);
                break;
            case 'bombAll':
                const bubblesToRemove = [...gameState.bubbles];
                bubblesToRemove.forEach(b => {
                    b.classList.add('pop');
                });
                setTimeout(() => {
                    bubblesToRemove.forEach(b => {
                        b.remove();
                        gameState.bubbles = gameState.bubbles.filter(bubble => bubble !== b);
                    });
                    if (gameState.mode === 'endless') {
                        generateNewBubbles(5);
                    } else if (gameState.bubbles.length === 0) {
                        endGame(true);
                    }
                }, 300);
                break;
        }
    }, 300);
}

function showPowerupPopup(bubble, text) {
    const popup = document.createElement('div');
    popup.className = 'powerup-popup';
    popup.textContent = text;

    const bubbleRect = bubble.getBoundingClientRect();
    const containerRect = bubbleContainer.getBoundingClientRect();

    popup.style.left = (bubbleRect.left - containerRect.left + bubbleRect.width / 2 - 40) + 'px';
    popup.style.top = (bubbleRect.top - containerRect.top - 30) + 'px';

    bubbleContainer.appendChild(popup);

    setTimeout(() => {
        popup.remove();
    }, 1500);
}

function playPowerupSound() {
    if (!gameState.soundEnabled) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

function updateScoreDisplay() {
    scoreDisplay.textContent = '消除: ' + gameState.score;
}

function updateLevelDisplay() {
    if (gameState.mode === 'timed') {
        levelDisplay.style.display = 'flex';
        levelDisplay.textContent = '关卡: ' + gameState.level;
    } else {
        levelDisplay.style.display = 'none';
    }
}

function updateComboDisplay() {
    comboDisplay.textContent = '连击: x' + gameState.combo;
    comboDisplay.style.animation = 'none';
    comboDisplay.offsetHeight;
    comboDisplay.style.animation = 'pulse 0.5s ease-in-out';
}

function updateTimerDisplay() {
    timerDisplay.textContent = '时间: ' + gameState.timeLeft + 's';
}

function startTimer() {
    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        updateTimerDisplay();

        if (gameState.timeLeft <= 5 && gameState.timeLeft > 0) {
            playCountdownSound();
            timerDisplay.style.animation = 'shake 0.3s ease-in-out';
            setTimeout(() => {
                timerDisplay.style.animation = '';
            }, 300);
        }

        if (gameState.timeLeft <= 0) {
            if (gameState.bubbles.length > 0) {
                playFailSound();
                endGame(false);
            } else {
                endGame(true);
            }
        }
    }, 1000);
}

function startGame(mode) {
    gameState.mode = mode;
    gameState.level = 1;
    gameState.score = 0;
    gameState.bubbles = [];
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.combo = 1;
    gameState.maxCombo = 1;
    gameState.scoreSubmitted = false;

    if (mode === 'timed') {
        const difficulty = calculateLevelDifficulty(gameState.level);
        gameState.bubbleCount = difficulty.bubbleCount;
        gameState.timeLeft = difficulty.time;
    } else {
        gameState.bubbleCount = BASE_BUBBLE_COUNT;
        gameState.timeLeft = BASE_TIME;
    }

    saveGameState();
    window.location.href = 'game.html';
}

function endGame(isSuccess = false) {
    gameState.isPlaying = false;

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }

    if (gameState.bubbleInterval) {
        clearInterval(gameState.bubbleInterval);
        gameState.bubbleInterval = null;
    }

    if (isSuccess && gameState.mode === 'timed') {
        if (gameState.token && !gameState.scoreSubmitted) {
            submitScore(gameState.mode, gameState.score, gameState.level);
            gameState.scoreSubmitted = true;
        }
        showLevelSuccess();
    } else {
        gameState.isSuccess = isSuccess;
        saveGameState();

        if (gameState.token && !gameState.scoreSubmitted) {
            submitScore(gameState.mode, gameState.score, gameState.level);
            gameState.scoreSubmitted = true;
        }

        window.location.href = 'result.html';
    }
}

async function saveScoreToLeaderboard() {
    const result = await submitScore(gameState.mode, gameState.score, gameState.level);

    if (!result.success) {
        console.error('Failed to save score:', result.error);
        return;
    }
}

function showLevelSuccess() {
    document.getElementById('success-score').textContent = gameState.score;
    document.getElementById('success-combo').textContent = 'x' + gameState.maxCombo;
    document.getElementById('current-level-display').textContent = gameState.level;
    levelSuccessOverlay.classList.add('active');
}

function nextLevel() {
    levelSuccessOverlay.classList.remove('active');

    gameState.level++;
    const difficulty = calculateLevelDifficulty(gameState.level);
    gameState.bubbleCount = difficulty.bubbleCount;
    gameState.timeLeft = difficulty.time;
    gameState.score = 0;
    gameState.combo = 1;
    gameState.maxCombo = 1;
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.scoreSubmitted = false;
    saveGameState();

    setTimeout(() => {
        bubbleContainer.innerHTML = '';
        updateLevelDisplay();
        updateScoreDisplay();
        updateComboDisplay();
        updateTimerDisplay();
        generateBubbles();
        animateBubbles();
        startTimer();
    }, 300);
}

function restartGame() {
    startGame(gameState.mode);
}

function backToHome() {
    gameState.isPlaying = false;

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }

    if (gameState.bubbleInterval) {
        clearInterval(gameState.bubbleInterval);
        gameState.bubbleInterval = null;
    }

    if (gameState.comboTimer) {
        clearTimeout(gameState.comboTimer);
        gameState.comboTimer = null;
    }

    if (bubbleContainer) {
        bubbleContainer.innerHTML = '';
    }
    gameState.bubbles = [];

    if (gameState.token && gameState.score > 0 && !gameState.scoreSubmitted) {
        submitScore(gameState.mode, gameState.score, gameState.level);
        gameState.scoreSubmitted = true;
    }

    localStorage.removeItem('gameState');
    window.location.href = 'start.html';
}

function toggleSound() {
    gameState.soundEnabled = !gameState.soundEnabled;
    soundToggleBtn.textContent = gameState.soundEnabled ? '🔊' : '🔇';
}

async function apiRequest(endpoint, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (gameState.token) {
        headers['Authorization'] = `Bearer ${gameState.token}`;
    }

    const options = {
        method,
        headers
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(API_BASE_URL + endpoint, options);
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        return { success: false, error: '网络连接失败，请检查服务器是否启动' };
    }
}

async function register(username, password) {
    return await apiRequest('/register', 'POST', { username, password });
}

async function login(username, password) {
    return await apiRequest('/login', 'POST', { username, password });
}

async function submitScore(mode, score, level) {
    console.log('提交分数:', { mode, score, level, hasToken: !!gameState.token });
    const result = await apiRequest('/scores', 'POST', { mode, score, level });
    console.log('提交分数结果:', result);
    return result;
}

async function getLeaderboard(mode) {
    return await apiRequest(`/leaderboard?mode=${mode}`);
}

async function getMyRank(mode) {
    return await apiRequest(`/my-rank?mode=${mode}`);
}

async function getUserInfo() {
    return await apiRequest('/user-info');
}

function pauseGame() {
    if (!gameState.isPlaying) return;

    gameState.isPaused = !gameState.isPaused;

    if (gameState.isPaused) {
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
        }
        pauseOverlay.classList.add('active');
    } else {
        if (gameState.mode === 'timed') {
            startTimer();
        }
        pauseOverlay.classList.remove('active');
    }
}

function resumeGame() {
    if (!gameState.isPlaying || !gameState.isPaused) return;

    gameState.isPaused = false;

    if (gameState.mode === 'timed') {
        startTimer();
    }
    pauseOverlay.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    createBackgroundBubbles();

    loadGameState();

    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (savedUser && savedToken) {
        try {
            gameState.user = JSON.parse(savedUser);
            gameState.token = savedToken;
        } catch (e) {
            console.error('Failed to parse saved user data');
        }
    }

    updateUserBar();

    if (window.location.pathname.includes('game.html') && gameState.mode) {
        setTimeout(() => {
            bubbleContainer.innerHTML = '';
            updateLevelDisplay();
            updateScoreDisplay();
            updateComboDisplay();

            if (gameState.mode === 'timed') {
                timerDisplay.style.display = 'block';
                updateTimerDisplay();
                if (gameState.isPlaying && !gameState.isPaused) {
                    startTimer();
                }
            } else {
                timerDisplay.style.display = 'none';
            }

            generateBubbles();
            animateBubbles();
        }, 100);
    }
});

function createBackgroundBubbles() {
    const container = document.getElementById('backgroundBubbles');
    if (!container) return;

    const colors = ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E91E63', '#00BCD4'];
    const bubbleCount = 50;
    const particleCount = 40;
    const animations = [
        'floatBubble',
        'floatBubbleDown',
        'floatBubbleLeft',
        'floatBubbleRight',
        'floatBubbleDiagonal1',
        'floatBubbleDiagonal2',
        'floatBubbleDiagonal3',
        'floatBubbleDiagonal4'
    ];

    const usedPositions = [];

    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bg-bubble';

        let left, top;
        let attempts = 0;
        do {
            left = Math.random() * 90 + 5;
            top = Math.random() * 90 + 5;
            attempts++;
        } while (attempts < 10 && usedPositions.some(pos =>
            Math.abs(pos.left - left) < 20 && Math.abs(pos.top - top) < 20
        ));

        usedPositions.push({ left, top });

        const size = Math.random() * 50 + 25;
        const duration = Math.random() * 10 + 15;
        const delay = Math.random() * 10;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const animation = animations[Math.floor(Math.random() * animations.length)];

        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';
        bubble.style.left = left + '%';
        bubble.style.top = top + '%';
        bubble.style.animationDuration = duration + 's';
        bubble.style.animationDelay = delay + 's';
        bubble.style.background = color;
        bubble.style.animationName = animation;

        container.appendChild(bubble);
    }

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const duration = Math.random() * 8 + 8;
        const delay = Math.random() * 10;

        particle.style.left = left + '%';
        particle.style.top = top + '%';
        particle.style.animationDuration = duration + 's';
        particle.style.animationDelay = delay + 's';

        container.appendChild(particle);
    }
}

function updateUserBar() {
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;

    if (gameState.user) {
        userInfo.innerHTML = `
            <span class="user-icon">👤</span>
            <span class="user-name">${escapeHtml(gameState.user.username)}</span>
        `;
    } else {
        userInfo.innerHTML = `
            <span class="user-icon">👤</span>
            <span class="user-name">未登录</span>
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}