import {
  ARROW_POINTS,
  BOSS_AGGRO_RANGE,
  BOSS_ATTACK_COOLDOWN,
  BOSS_JUMP_FORCE,
  BOSS_JUMP_INTERVAL,
  BOSS_MOVE_SPEED,
  BOSS_POINTS,
  BOSS_PROJECTILE_SPEED,
  BOSS_SIZE,
  CANVAS_HEIGHT,
  GRAVITY,
  PLAYER_SIZE,
} from './constants'

export function updateBossSystem({
  game,
  deltaTime,
  getAttackHitbox,
  syncBossHud,
  addScore,
  setGameState,
}) {
  const { boss, player, platforms, arrows } = game
  if (!boss.active || boss.dead) return

  const distToPlayerX = Math.abs(player.x - boss.x)

  if (distToPlayerX < BOSS_AGGRO_RANGE) {
    if (boss.onGround) {
      if (distToPlayerX > 80) {
        const direction = player.x > boss.x ? 1 : -1
        boss.vx = direction * BOSS_MOVE_SPEED
      } else {
        boss.vx = 0
      }

      if (Math.random() < 0.02 || (boss.jumpTimer || 0) <= 0) {
        boss.vy = BOSS_JUMP_FORCE
        boss.onGround = false
        boss.jumpTimer = BOSS_JUMP_INTERVAL + Math.random() * 1000
      }
    }
  } else if (boss.onGround) {
    boss.vx = 0
  }

  if (boss.jumpTimer > 0) {
    boss.jumpTimer -= deltaTime
  }

  boss.vy += GRAVITY * 0.8
  boss.x += boss.vx
  boss.y += boss.vy

  platforms.forEach((platform) => {
    if (
      boss.x < platform.x + platform.width &&
      boss.x + BOSS_SIZE > platform.x &&
      boss.y + BOSS_SIZE > platform.y &&
      boss.y + BOSS_SIZE < platform.y + platform.height + 10 &&
      boss.vy >= 0
    ) {
      boss.y = platform.y - BOSS_SIZE
      boss.vy = 0
      boss.onGround = true
    }
  })

  if (boss.x < 0) boss.x = 0
  if (boss.x > game.levelWidth - BOSS_SIZE) {
    boss.x = game.levelWidth - BOSS_SIZE
  }

  if (boss.attackCooldown > 0) {
    boss.attackCooldown -= deltaTime
  }

  if (boss.attackCooldown <= 0 && distToPlayerX < BOSS_AGGRO_RANGE) {
    const dirX = player.x + PLAYER_SIZE / 2 - (boss.x + BOSS_SIZE / 2)
    const dirY = player.y + PLAYER_SIZE / 2 - (boss.y + BOSS_SIZE / 2)
    const dist = Math.sqrt(dirX * dirX + dirY * dirY) || 1

    boss.projectiles.push({
      x: boss.x + BOSS_SIZE / 2 - 6,
      y: boss.y + BOSS_SIZE / 2 - 6,
      vx: (dirX / dist) * BOSS_PROJECTILE_SPEED,
      vy: (dirY / dist) * BOSS_PROJECTILE_SPEED,
      life: 3000,
    })

    boss.attackCooldown = BOSS_ATTACK_COOLDOWN
  }

  boss.projectiles.forEach((proj) => {
    proj.x += proj.vx
    proj.y += proj.vy
    proj.vy += 0.15
    proj.life -= deltaTime
  })

  boss.projectiles = boss.projectiles.filter(
    (proj) =>
      proj.life > 0 &&
      proj.x > -50 &&
      proj.x < game.levelWidth + 50 &&
      proj.y < CANVAS_HEIGHT + 50,
  )

  if (player.isAttacking && player.attackDirection) {
    const hitbox = getAttackHitbox(player, player.attackDirection, PLAYER_SIZE)
    if (
      hitbox.x < boss.x + BOSS_SIZE &&
      hitbox.x + hitbox.width > boss.x &&
      hitbox.y < boss.y + BOSS_SIZE &&
      hitbox.y + hitbox.height > boss.y &&
      !boss.hitFlash
    ) {
      boss.hp -= 1
      boss.hitFlash = 200
      addScore(100)
      syncBossHud(boss)

      for (let i = 0; i < 12; i += 1) {
        const angle = (Math.PI * 2 * i) / 12
        game.arrowImpacts.push({
          x: boss.x + BOSS_SIZE / 2,
          y: boss.y + BOSS_SIZE / 2,
          vx: Math.cos(angle) * 4,
          vy: Math.sin(angle) * 4,
          life: 400,
          maxLife: 400,
        })
      }

      if (boss.hp <= 0) {
        boss.dead = true
        syncBossHud(boss)
        addScore(BOSS_POINTS)
        setGameState('win')
      }
    }
  }

  arrows.forEach((arrow) => {
    if (arrow.stuck || arrow.hitEnemy || arrow.hitBoss) return

    if (
      arrow.x < boss.x + BOSS_SIZE &&
      arrow.x + 24 > boss.x &&
      arrow.y < boss.y + BOSS_SIZE &&
      arrow.y + 8 > boss.y
    ) {
      arrow.hitBoss = true
      arrow.hitEnemy = true
      boss.hp -= 1
      boss.hitFlash = 200
      addScore(ARROW_POINTS)
      syncBossHud(boss)

      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8
        game.arrowImpacts.push({
          x: boss.x + BOSS_SIZE / 2,
          y: boss.y + BOSS_SIZE / 2,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 300,
          maxLife: 300,
          size: 5,
        })
      }

      if (boss.hp <= 0) {
        boss.dead = true
        syncBossHud(boss)
        addScore(BOSS_POINTS)
        setGameState('win')
      }
    }
  })

  if (boss.hitFlash > 0) {
    boss.hitFlash -= deltaTime
  }
  syncBossHud(boss)
}
