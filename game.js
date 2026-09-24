let score = 0;
let time = 30;

let highScore = Number(localStorage.getItem("highScore")) || 0;

let gameRunning = false;
let timer;

let circleSize = 50;

const circle = document.getElementById("circle");

const scoreText = document.getElementById("score");
const timeText = document.getElementById("time");
const highScoreText = document.getElementById("highScore");

const game = document.getElementById("game");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const message = document.getElementById("message");

const gameOver = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");

// Show saved high score
highScoreText.textContent = highScore;

// Hide game elements initially
circle.style.display = "none";
gameOver.style.display = "none";

// Start game
startButton.addEventListener("click", startGame);

// Restart game
restartButton.addEventListener("click", startGame);

// Circle click
circle.addEventListener("click", function () {
  if (!gameRunning) {
    return;
  }

  score++;

  scoreText.textContent = score;

  // Make circle smaller as score increases

  circleSize = Math.max(20, 50 - score);

  circle.style.width = circleSize + "px";
  circle.style.height = circleSize + "px";

  // Click animation

  circle.classList.add("clicked");

  setTimeout(function () {
    circle.classList.remove("clicked");
  }, 100);

  // Move circle

  moveCircle();
});

// Start game function

function startGame() {
  score = 0;
  time = 30;

  circleSize = 50;

  gameRunning = true;

  // Reset UI

  scoreText.textContent = score;
  timeText.textContent = time;

  // Reset circle

  circle.style.width = circleSize + "px";
  circle.style.height = circleSize + "px";

  circle.style.display = "block";

  // Hide game-over screen

  gameOver.style.display = "none";

  // Update message

  message.textContent = "Click the circle as fast as you can!";

  // Disable start button

  startButton.disabled = true;

  // Put circle at random position

  moveCircle();

  // Start timer

  timer = setInterval(function () {
    time--;

    timeText.textContent = time;

    if (time === 0) {
      endGame();
    }
  }, 1000);
}

// End game function

function endGame() {
  gameRunning = false;

  // Stop timer

  clearInterval(timer);

  // Hide circle

  circle.style.display = "none";

  // Enable start button

  startButton.disabled = false;

  // Show final score

  finalScore.textContent = score;

  // Check high score

  if (score > highScore) {
    highScore = score;

    highScoreText.textContent = highScore;

    // Save high score

    localStorage.setItem("highScore", highScore);
  }

  // Show game-over screen

  gameOver.style.display = "flex";

  message.textContent = "Can you beat your best score?";
}

// Move circle

function moveCircle() {
  const maxX = game.clientWidth - circleSize;
  const maxY = game.clientHeight - circleSize;

  const randomX = Math.random() * maxX;
  const randomY = Math.random() * maxY;

  circle.style.left = randomX + "px";
  circle.style.top = randomY + "px";
}
