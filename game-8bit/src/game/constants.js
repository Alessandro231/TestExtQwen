export const CANVAS_WIDTH = 640
export const CANVAS_HEIGHT = 480
export const PLAYER_SIZE = 32
export const GRAVITY = 0.6
export const JUMP_FORCE = -12
export const MOVE_SPEED = 5
export const DASH_SPEED = 18
export const DASH_DURATION = 150
export const MAX_DASH_CHARGES = 3
export const DASH_RECHARGE_TIME = 2000
export const DAMAGE_INVULN_TIME = 1000
export const COYOTE_TIME_MS = 120
export const JUMP_BUFFER_MS = 140
export const DEBUG_HUD_UPDATE_MS = 120

export const SWORD_DURATION = 10000
export const SWORD_WARNING_TIME = 3000
export const SWORD_CRITICAL_TIME = 1000
export const ATTACK_DURATION = 200
export const ATTACK_COOLDOWN = 300
export const ATTACK_POINTS = 200

export const MAX_ARROWS = 20
export const START_ARROWS = 10
export const ARROW_SPEED = 12
export const ARROW_MAX_DISTANCE = 400
export const ARROW_STUCK_TIME = 3000
export const SHOOT_COOLDOWN = 250
export const ARROW_POINTS = 150

export const BOSS_MAX_HP = 5
export const BOSS_ATTACK_COOLDOWN = 1800
export const BOSS_SIZE = 64
export const BOSS_PROJECTILE_SPEED = 6
export const BOSS_POINTS = 5000
export const BOSS_JUMP_FORCE = -14
export const BOSS_MOVE_SPEED = 1.2
export const BOSS_AGGRO_RANGE = 400
export const BOSS_JUMP_INTERVAL = 2000

export const BOSS_SPRITE = [
  [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 2, 2, 1, 1, 0, 0],
  [0, 1, 1, 2, 3, 3, 2, 1, 1, 0],
  [1, 1, 2, 3, 4, 4, 3, 2, 1, 1],
  [1, 2, 3, 3, 1, 1, 3, 3, 2, 1],
  [1, 2, 3, 3, 3, 3, 3, 3, 2, 1],
  [0, 1, 2, 3, 3, 3, 3, 2, 1, 0],
  [0, 1, 1, 2, 2, 2, 2, 1, 1, 0],
  [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
]

export const PLAYER_SPRITE = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 1, 3, 3, 1, 1, 0],
  [0, 1, 3, 3, 3, 3, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
]

export const COIN_SPRITE = [
  [0, 1, 1, 1, 1, 0],
  [1, 2, 2, 2, 2, 1],
  [1, 2, 3, 3, 2, 1],
  [1, 2, 2, 2, 2, 1],
  [0, 1, 1, 1, 1, 0],
]

export const ENEMY_SPRITE = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [1, 2, 3, 3, 3, 3, 2, 1],
  [1, 2, 3, 1, 1, 3, 2, 1],
  [1, 2, 3, 3, 3, 3, 2, 1],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
]

export const COLORS = {
  1: '#5D9CEC',
  2: '#4A89DC',
  3: '#326FB5',
  sky: '#87CEEB',
  ground: '#8B4513',
  grass: '#228B22',
  coin: '#FFD700',
  coinInner: '#FFA500',
  enemy: '#DC143C',
  enemyInner: '#8B0000',
}

export const LEVEL_SKY_COLORS = {
  1: '#87CEEB',
  2: '#FFB6C1',
  3: '#2C3E50',
}
