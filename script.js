// Game variables
let canvas, ctx;
let gameState = 'start'; // start, playing, gameOver, victory, revelation, wedding
let score = 0;
let powerupsCollected = 0;

// Bird object
const bird = {
    x: 150,
    y: 300,
    velocity: 0,
    gravity: 0.5,
    jumpForce: -8,
    size: 30,
    color: '#FFD700'
};

// Monster object
const monster = {
    x: 700,
    y: 300,
    health: 100,
    maxHealth: 100,
    size: 60,
    slowdownTime: 0,
    color: '#8B0000',
    shootCooldown: 0,
    shootInterval: 120 // Shoot every 2 seconds at 60fps
};

// Game objects arrays
const pipes = [];
const powerups = [];
const particles = [];
const lightningBolts = [];

// Game settings
const pipeWidth = 80;
const pipeGap = 200;
const powerupSize = 25;

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', resetGame);
    document.getElementById('continueBtn').addEventListener('click', showRevelation);
    document.getElementById('proposalBtn').addEventListener('click', showWedding);
    document.getElementById('playAgainBtn').addEventListener('click', resetGame);
    
    // Game controls
    document.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleClick);
    
    // Start game loop
    gameLoop();
}

function startGame() {
    gameState = 'playing';
    showScreen('gameScreen');
    resetGameObjects();
}

function resetGame() {
    gameState = 'start';
    showScreen('startScreen');
    resetGameObjects();
}

function resetGameObjects() {
    score = 0;
    powerupsCollected = 0;
    
    // Reset bird
    bird.x = 150;
    bird.y = 300;
    bird.velocity = 0;
    
    // Reset monster
    monster.x = 700;
    monster.y = 300;
    monster.health = monster.maxHealth;
    monster.slowdownTime = 0;
    monster.shootCooldown = 0;
    
    // Clear arrays
    pipes.length = 0;
    powerups.length = 0;
    particles.length = 0;
    lightningBolts.length = 0;
    
    updateUI();
}

function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function showRevelation() {
    gameState = 'revelation';
    showScreen('revelationScreen');
}

function showWedding() {
    gameState = 'wedding';
    showScreen('weddingScreen');
}

function handleKeyDown(e) {
    if (e.code === 'Space' && gameState === 'playing') {
        e.preventDefault();
        bird.velocity = bird.jumpForce;
    }
}

function handleClick() {
    if (gameState === 'playing') {
        bird.velocity = bird.jumpForce;
    }
}

function updateUI() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('monsterHealth').textContent = `Monster Health: ${monster.health}`;
    document.getElementById('powerups').textContent = `Power-ups: ${powerupsCollected}`;
    document.getElementById('finalScore').textContent = `Score: ${score}`;
}

// Game loop
function gameLoop() {
    if (gameState === 'playing') {
        update();
        draw();
    }
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update bird
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    
    // Keep bird in bounds
    if (bird.y < 0) bird.y = 0;
    if (bird.y > canvas.height - bird.size) {
        gameOver();
        return;
    }
    
    // Update monster
    updateMonster();
    
    // Update lightning bolts
    updateLightningBolts();
    
    // Generate pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 300) {
        generatePipe();
    }
    
    // Update pipes
    updatePipes();
    
    // Generate and update powerups
    if (Math.random() < 0.003) {
        generatePowerup();
    }
    updatePowerups();
    
    // Update particles
    updateParticles();
    
    // Check collisions
    checkCollisions();
    
    // Update UI
    updateUI();
}

function updateMonster() {
    // Monster stays in fixed position but still applies slowdown effects
    if (monster.slowdownTime > 0) {
        monster.slowdownTime--;
    }
    
    // Handle shooting lightning bolts
    if (monster.shootCooldown > 0) {
        monster.shootCooldown--;
    } else if (monster.slowdownTime <= 0) { // Don't shoot when slowed down
        shootLightningBolt();
        monster.shootCooldown = monster.shootInterval;
    }
}

function generatePipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - pipeGap - minHeight;
    const height = Math.random() * (maxHeight - minHeight) + minHeight;
    
    pipes.push({
        x: canvas.width,
        topHeight: height,
        bottomY: height + pipeGap,
        bottomHeight: canvas.height - (height + pipeGap),
        passed: false
    });
}

function updatePipes() {
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= 3;
        
        // Remove off-screen pipes
        if (pipe.x + pipeWidth < 0) {
            pipes.splice(i, 1);
            continue;
        }
        
        // Score when bird passes pipe
        if (!pipe.passed && bird.x > pipe.x + pipeWidth) {
            pipe.passed = true;
            score++;
            
            // Damage monster when scoring
            monster.health -= 5;
            createParticles(monster.x, monster.y, '#FF0000');
            
            if (monster.health <= 0) {
                victory();
                return;
            }
        }
    }
}

function generatePowerup() {
    powerups.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - 100) + 50,
        collected: false
    });
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        powerup.x -= 2;
        
        // Remove off-screen powerups
        if (powerup.x + powerupSize < 0) {
            powerups.splice(i, 1);
        }
    }
}

function shootLightningBolt() {
    // Aim at the bird's current position with some prediction
    const targetX = bird.x + bird.velocity * 10; // Predict where bird will be
    const targetY = bird.y + bird.velocity * 10;
    
    const dx = targetX - monster.x;
    const dy = targetY - monster.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const speed = 4;
    lightningBolts.push({
        x: monster.x,
        y: monster.y,
        vx: (dx / distance) * speed,
        vy: (dy / distance) * speed,
        life: 200, // How long the bolt lasts
        width: 8,
        length: 30
    });
}

function updateLightningBolts() {
    for (let i = lightningBolts.length - 1; i >= 0; i--) {
        const bolt = lightningBolts[i];
        bolt.x += bolt.vx;
        bolt.y += bolt.vy;
        bolt.life--;
        
        // Remove expired or off-screen bolts
        if (bolt.life <= 0 || bolt.x < -50 || bolt.x > canvas.width + 50 || 
            bolt.y < -50 || bolt.y > canvas.height + 50) {
            lightningBolts.splice(i, 1);
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            color: color,
            life: 30
        });
    }
}

function checkCollisions() {
    // Check pipe collisions
    for (const pipe of pipes) {
        if (bird.x + bird.size > pipe.x && bird.x < pipe.x + pipeWidth) {
            if (bird.y < pipe.topHeight || bird.y + bird.size > pipe.bottomY) {
                gameOver();
                return;
            }
        }
    }
    
    // Check lightning bolt collisions
    for (const bolt of lightningBolts) {
        const dx = (bird.x + bird.size/2) - bolt.x;
        const dy = (bird.y + bird.size/2) - bolt.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (bird.size/2 + bolt.width/2)) {
            gameOver();
            return;
        }
    }
    
    // Check powerup collisions
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        const dx = bird.x + bird.size/2 - (powerup.x + powerupSize/2);
        const dy = bird.y + bird.size/2 - (powerup.y + powerupSize/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (bird.size + powerupSize) / 2) {
            powerups.splice(i, 1);
            powerupsCollected++;
            monster.slowdownTime += 180; // 3 seconds at 60fps
            createParticles(powerup.x, powerup.y, '#FFD700');
        }
    }
}

function gameOver() {
    gameState = 'gameOver';
    showScreen('gameOverScreen');
}

function victory() {
    gameState = 'victory';
    showScreen('victoryScreen');
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw pipes
    drawPipes();
    
    // Draw powerups
    drawPowerups();
    
    // Draw bird
    drawBird();
    
    // Draw lightning bolts
    drawLightningBolts();
    
    // Draw monster
    drawMonster();
    
    // Draw particles
    drawParticles();
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x + bird.size/2, bird.y + bird.size/2);
    
    // Rotate bird based on velocity
    const rotation = Math.min(Math.max(bird.velocity * 0.1, -0.5), 0.5);
    ctx.rotate(rotation);
    
    // Draw bird body
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.arc(0, 0, bird.size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw wing
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.ellipse(-5, 0, 8, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eye
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(5, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw beak
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(25, -3);
    ctx.lineTo(25, 3);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

function drawMonster() {
    const x = monster.x;
    const y = monster.y;
    const size = monster.size;
    
    // Monster body (changes color based on slowdown)
    if (monster.slowdownTime > 0) {
        ctx.fillStyle = '#4A90E2'; // Blue when slowed
    } else {
        ctx.fillStyle = monster.color;
    }
    
    ctx.beginPath();
    ctx.arc(x, y, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Monster eyes
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(x - 10, y - 10, 5, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 10, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Monster mouth
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y + 5, 15, 0, Math.PI);
    ctx.stroke();
    
    // Monster teeth
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 15 + i * 7, y + 5);
        ctx.lineTo(x - 12 + i * 7, y + 15);
        ctx.lineTo(x - 9 + i * 7, y + 5);
        ctx.fill();
    }
    
    // Health bar
    const barWidth = 60;
    const barHeight = 8;
    const healthPercent = monster.health / monster.maxHealth;
    
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x - barWidth/2, y - size/2 - 20, barWidth, barHeight);
    
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(x - barWidth/2, y - size/2 - 20, barWidth * healthPercent, barHeight);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - barWidth/2, y - size/2 - 20, barWidth, barHeight);
}

function drawPipes() {
    ctx.fillStyle = '#228B22';
    ctx.strokeStyle = '#006400';
    ctx.lineWidth = 3;
    
    for (const pipe of pipes) {
        // Top pipe
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, pipe.bottomHeight);
        ctx.strokeRect(pipe.x, pipe.bottomY, pipeWidth, pipe.bottomHeight);
        
        // Pipe caps
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipeWidth + 10, 20);
        ctx.strokeRect(pipe.x - 5, pipe.topHeight - 20, pipeWidth + 10, 20);
        
        ctx.fillRect(pipe.x - 5, pipe.bottomY, pipeWidth + 10, 20);
        ctx.strokeRect(pipe.x - 5, pipe.bottomY, pipeWidth + 10, 20);
    }
}

function drawPowerups() {
    for (const powerup of powerups) {
        // Star shape
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        const centerX = powerup.x + powerupSize/2;
        const centerY = powerup.y + powerupSize/2;
        const spikes = 5;
        const outerRadius = powerupSize/2;
        const innerRadius = outerRadius * 0.5;
        
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i / (spikes * 2)) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Sparkle effect
        const time = Date.now() * 0.01;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX + Math.sin(time) * 5, centerY + Math.cos(time) * 5, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawLightningBolts() {
    for (const bolt of lightningBolts) {
        ctx.save();
        
        // Calculate angle of the bolt
        const angle = Math.atan2(bolt.vy, bolt.vx);
        
        // Draw main lightning bolt
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = bolt.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(bolt.x, bolt.y);
        
        // Create jagged lightning effect
        const segments = 5;
        for (let i = 1; i <= segments; i++) {
            const progress = i / segments;
            const x = bolt.x + Math.cos(angle) * bolt.length * progress;
            const y = bolt.y + Math.sin(angle) * bolt.length * progress;
            
            // Add random jagged offset
            const offsetX = (Math.random() - 0.5) * 8;
            const offsetY = (Math.random() - 0.5) * 8;
            
            ctx.lineTo(x + offsetX, y + offsetY);
        }
        ctx.stroke();
        
        // Draw inner bright core
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = bolt.width * 0.3;
        ctx.shadowBlur = 5;
        
        ctx.beginPath();
        ctx.moveTo(bolt.x, bolt.y);
        ctx.lineTo(bolt.x + Math.cos(angle) * bolt.length, bolt.y + Math.sin(angle) * bolt.length);
        ctx.stroke();
        
        ctx.restore();
    }
}

function drawParticles() {
    for (const particle of particles) {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 30;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// Initialize the game when page loads
window.addEventListener('load', init);
