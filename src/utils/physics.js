/**
 * src/utils/physics.js
 * Pure physics / math helpers for the Pong game.
 * Stateless functions — easy to test and reason about.
 */

// ─── Constants ────────────────────────────────────────────────────────────────
export const CANVAS_W = 300;
export const CANVAS_H = 380;
export const PADDLE_W = 56;
export const PADDLE_H = 8;
export const BALL_RADIUS = 5;
export const PADDLE_Y_PLAYER = CANVAS_H - 24;   // player paddle Y (bottom)
export const PADDLE_Y_AI = 16;                    // AI paddle Y (top)

// Speed config
export const INITIAL_BALL_SPEED = 5.5;
export const MAX_BALL_SPEED = 25.0;  // increased maximum speed for endgame intensity
export const SPEED_INCREMENT = 0.6;  // added per paddle hit (significantly increased for rapidly increasing difficulty)

// AI config
export const AI_BASE_SPEED = 2.4;  // increased from 2.0 for better challenge
export const AI_MAX_SPEED = 4.2;   // increased from 3.8 for better challenge

/**
 * Create a fresh ball state aimed at the player.
 * @param {number} [targetX] - Optional X to aim toward (adds randomness)
 * @returns {{ x, y, vx, vy, speed, trail: [] }}
 */
export function createBall(targetX = CANVAS_W / 2) {
  const speed = INITIAL_BALL_SPEED;
  // Random angle between -35° and +35° from vertical, biased toward center
  const maxAngle = Math.PI / 5; // 36°
  const angle = (Math.random() * 2 - 1) * maxAngle;

  // Aim toward target with slight randomness
  const dirX = Math.sin(angle) * (Math.random() > 0.5 ? 1 : -1);
  const dirY = 1; // always serve toward player first

  return {
    x: CANVAS_W / 2,
    y: CANVAS_H / 2,
    vx: dirX * speed,
    vy: dirY * speed,
    speed,
    trail: [],
  };
}

/**
 * Compute bounce angle when ball hits a paddle.
 * Returns new { vx, vy, speed } — does NOT mutate ball.
 *
 * The hit position on the paddle (0=left edge, 1=right edge) determines angle:
 * - Center hit → nearly straight return
 * - Edge hit   → sharper angle
 *
 * @param {object} ball
 * @param {number} paddleX - Left edge of paddle
 * @param {number} direction - +1 (going down toward player), -1 (going up toward AI)
 */
export function computePaddleBounce(ball, paddleX, direction) {
  // Ensure we have valid ball speed
  const currentSpeed = isNaN(ball.speed) ? INITIAL_BALL_SPEED : ball.speed;
  
  const hitPos = (ball.x - paddleX) / PADDLE_W; // 0..1
  
  console.log('computePaddleBounce debug:', { ballX: ball.x, paddleX, hitPos, currentSpeed });
  
  // Clamp hit position to valid range to prevent NaN
  const normalizedHit = Math.max(0.05, Math.min(0.95, hitPos)); // clamp edges slightly

  console.log('Normalized hit:', normalizedHit);

  // Map hit position to angle: center = 0°, edges = ±60°
  const maxBounceAngle = (Math.PI / 3); // 60°
  const angle = (normalizedHit - 0.5) * 2 * maxBounceAngle;

  console.log('Angle calculation:', { normalizedHit, angle, maxBounceAngle });

  const newSpeed = Math.min(currentSpeed + SPEED_INCREMENT, MAX_BALL_SPEED);

  // Safety check to prevent NaN
  const finalVx = Math.sin(angle) * newSpeed;
  const finalVy = -Math.sign(direction) * Math.cos(angle) * newSpeed;

  console.log('Final values:', { finalVx, finalVy, newSpeed });

  return {
    vx: isNaN(finalVx) ? 0 : finalVx,
    vy: isNaN(finalVy) ? -direction * newSpeed : finalVy,
    speed: isNaN(newSpeed) ? INITIAL_BALL_SPEED : newSpeed,
  };
}

/**
 * Reflect ball off left/right walls.
 * Returns new vx.
 * @param {number} vx
 * @param {number} ballX
 */
export function reflectWall(vx, ballX) {
  if (ballX - BALL_RADIUS <= 0 || ballX + BALL_RADIUS >= CANVAS_W) {
    return -vx;
  }
  return vx;
}

/**
 * Check AABB collision between ball and a paddle.
 * Returns true if overlapping.
 *
 * @param {object} ball - { x, y }
 * @param {number} paddleX
 * @param {number} paddleY
 */
export function ballHitsPaddle(ball, paddleX, paddleY) {
  // More precise collision detection
  const ballLeft = ball.x - BALL_RADIUS;
  const ballRight = ball.x + BALL_RADIUS;
  const ballTop = ball.y - BALL_RADIUS;
  const ballBottom = ball.y + BALL_RADIUS;
  
  const paddleLeft = paddleX;
  const paddleRight = paddleX + PADDLE_W;
  const paddleTop = paddleY;
  const paddleBottom = paddleY + PADDLE_H;
  
  return (
    ballRight >= paddleLeft &&
    ballLeft <= paddleRight &&
    ballBottom >= paddleTop &&
    ballTop <= paddleBottom
  );
}

/**
 * Simple AI paddle movement — tracks ball with speed cap and slight lag.
 * Returns new AI paddle X.
 *
 * @param {number} aiX - Current AI paddle left edge X
 * @param {number} ballX - Ball X
 * @param {number} difficulty - 0..1 (affects speed and reaction)
 * @param {number} dt - Delta time multiplier (usually 1)
 */
export function moveAI(aiX, ballX, difficulty = 0.5, dt = 1) {
  const speed = AI_BASE_SPEED + difficulty * (AI_MAX_SPEED - AI_BASE_SPEED);
  
  // Add occasional prediction error for more natural feel
  const errorChance = 0.15 - difficulty * 0.1; // Less error at higher difficulty
  const predictionError = Math.random() < errorChance ? (Math.random() - 0.5) * 20 : 0;
  
  const targetX = ballX - PADDLE_W / 2 + predictionError;

  // Add slight intentional lag for fairness
  const lagFactor = 0.82 + difficulty * 0.1; // Slightly more lag for natural feel
  const interpolated = aiX + (targetX - aiX) * lagFactor * 0.08;

  const dx = interpolated - aiX;
  const move = Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);

  return Math.max(0, Math.min(CANVAS_W - PADDLE_W, aiX + move));
}

/**
 * Update ball trail array (circular buffer, max 8 points).
 * @param {Array} trail - Existing trail
 * @param {number} x
 * @param {number} y
 * @returns {Array}
 */
export function updateTrail(trail, x, y) {
  const MAX_TRAIL = 8;
  const next = [...trail, { x, y }];
  return next.length > MAX_TRAIL ? next.slice(next.length - MAX_TRAIL) : next;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation.
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
