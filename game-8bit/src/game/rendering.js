import {
  ATTACK_DURATION,
  BOSS_SIZE,
  BOSS_SPRITE,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COIN_SPRITE,
  COLORS,
  ENEMY_SPRITE,
  LEVEL_SKY_COLORS,
  PLAYER_SIZE,
  PLAYER_SPRITE,
} from './constants'
import { getAttackHitbox } from './combat'

const drawSprite = (ctx, sprite, x, y, size, colors) => {
  const pixelSize = size / sprite.length
  sprite.forEach((row, rowIndex) => {
    row.forEach((pixel, colIndex) => {
      if (pixel !== 0) {
        ctx.fillStyle = colors[pixel] || colors[1]
        ctx.fillRect(
          x + colIndex * pixelSize,
          y + rowIndex * pixelSize,
          pixelSize,
          pixelSize,
        )
      }
    })
  })
}

const drawEquippedSword = (ctx, x, y, time) => {
  const size = 32
  const floatY = Math.sin(time / 200) * 2

  ctx.save()
  const swordX = x + size - 4
  const swordY = y + 12 + floatY

  ctx.fillStyle = '#C0C0C0'
  ctx.fillRect(swordX, swordY, 16, 4)

  ctx.fillStyle = '#E8E8E8'
  ctx.fillRect(swordX + 14, swordY, 4, 4)

  ctx.fillStyle = '#FFD700'
  ctx.fillRect(swordX - 2, swordY - 4, 6, 12)

  ctx.fillStyle = '#8B4513'
  ctx.fillRect(swordX - 6, swordY - 2, 6, 6)

  ctx.fillStyle = 'rgba(255, 215, 0, 0.2)'
  ctx.beginPath()
  ctx.arc(x + size / 2, y + 16 + floatY, 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawEquippedBow = (ctx, x, y, time) => {
  const size = 32
  const floatY = Math.sin(time / 200) * 2

  ctx.save()
  const bowX = x + 8
  const bowY = y + 6 + floatY

  ctx.strokeStyle = '#8B4513'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(bowX + 8, bowY + 10, 12, -Math.PI * 0.7, Math.PI * 0.7, false)
  ctx.stroke()

  ctx.fillStyle = '#A0522D'
  ctx.beginPath()
  ctx.arc(bowX + 8, bowY + 10, 10, -Math.PI * 0.5, Math.PI * 0.5, false)
  ctx.stroke()

  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(bowX + 8, bowY - 2)
  ctx.lineTo(bowX + 8, bowY + 22)
  ctx.stroke()

  ctx.fillStyle = '#696969'
  ctx.beginPath()
  ctx.moveTo(bowX + 6, bowY - 2)
  ctx.lineTo(bowX + 10, bowY - 2)
  ctx.lineTo(bowX + 10, bowY + 2)
  ctx.lineTo(bowX + 6, bowY + 2)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(bowX + 6, bowY + 20)
  ctx.lineTo(bowX + 10, bowY + 20)
  ctx.lineTo(bowX + 10, bowY + 24)
  ctx.lineTo(bowX + 6, bowY + 24)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'rgba(139, 69, 19, 0.2)'
  ctx.beginPath()
  ctx.arc(x + size / 2, y + 16 + floatY, 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawPlayer = (ctx, player, dashState, timestamp) => {
  dashState.trail.forEach((trail) => {
    ctx.save()
    ctx.globalAlpha = trail.alpha
    if (!trail.facingRight) {
      ctx.translate(trail.x + PLAYER_SIZE, trail.y)
      ctx.scale(-1, 1)
      drawSprite(ctx, PLAYER_SPRITE, 0, 0, PLAYER_SIZE, {
        ...COLORS,
        1: '#00FFFF',
        2: '#87CEEB',
        3: '#4682B4',
      })
    } else {
      drawSprite(ctx, PLAYER_SPRITE, trail.x, trail.y, PLAYER_SIZE, {
        ...COLORS,
        1: '#00FFFF',
        2: '#87CEEB',
        3: '#4682B4',
      })
    }
    ctx.restore()
  })

  if (player.isDashing && Math.floor(timestamp / 30) % 2 === 0) {
    return
  }

  ctx.save()
  if (!player.facingRight) {
    ctx.translate(player.x + PLAYER_SIZE, player.y)
    ctx.scale(-1, 1)
    drawSprite(ctx, PLAYER_SPRITE, 0, 0, PLAYER_SIZE, COLORS)
    if (player.hasSword) drawEquippedSword(ctx, 0, 0, timestamp)
    if (player.hasBow) drawEquippedBow(ctx, 0, 0, timestamp)
  } else {
    drawSprite(ctx, PLAYER_SPRITE, player.x, player.y, PLAYER_SIZE, COLORS)
    if (player.hasSword) drawEquippedSword(ctx, player.x, player.y, timestamp)
    if (player.hasBow) drawEquippedBow(ctx, player.x, player.y, timestamp)
  }
  ctx.restore()
}

const drawBowItem = (ctx, item, time) => {
  const x = item.x
  const y = item.y + item.floatOffset
  const floatY = Math.sin(time / 200) * 2

  ctx.save()
  ctx.strokeStyle = '#8B4513'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(x + 12, y + 12 + floatY, 10, -Math.PI * 0.7, Math.PI * 0.7, false)
  ctx.stroke()

  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + 12, y + 2 + floatY)
  ctx.lineTo(x + 12, y + 22 + floatY)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'
  ctx.beginPath()
  ctx.arc(x + 12, y + 12 + floatY, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawArrow = (ctx, arrow) => {
  const x = arrow.x
  const y = arrow.y
  ctx.save()
  if (arrow.stuck) ctx.globalAlpha = arrow.stuckAlpha || 0.8

  ctx.fillStyle = '#8B4513'
  if (arrow.vx > 0 || (!arrow.vx && !arrow.vy)) {
    ctx.fillRect(x, y + 3, 16, 3)
    ctx.fillStyle = '#696969'
    ctx.beginPath()
    ctx.moveTo(x + 16, y)
    ctx.lineTo(x + 24, y + 4)
    ctx.lineTo(x + 16, y + 8)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(x - 2, y + 2, 4, 4)
  } else if (arrow.vx < 0) {
    ctx.fillRect(x + 8, y + 3, 16, 3)
    ctx.fillStyle = '#696969'
    ctx.beginPath()
    ctx.moveTo(x + 8, y)
    ctx.lineTo(x, y + 4)
    ctx.lineTo(x + 8, y + 8)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(x + 22, y + 2, 4, 4)
  } else if (arrow.vy < 0) {
    ctx.fillRect(x + 3, y + 8, 3, 16)
    ctx.fillStyle = '#696969'
    ctx.beginPath()
    ctx.moveTo(x, y + 8)
    ctx.lineTo(x + 4, y)
    ctx.lineTo(x + 8, y + 8)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(x + 2, y + 22, 4, 4)
  } else if (arrow.vy > 0) {
    ctx.fillRect(x + 3, y, 3, 16)
    ctx.fillStyle = '#696969'
    ctx.beginPath()
    ctx.moveTo(x, y + 8)
    ctx.lineTo(x + 4, y + 16)
    ctx.lineTo(x + 8, y + 8)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(x + 2, y - 2, 4, 4)
  }
  ctx.restore()
}

const drawSwordAttack = (ctx, player, direction, timer) => {
  const x = player.x
  const y = player.y
  const progress = timer / ATTACK_DURATION
  const alpha = Math.max(0.3, progress) * 0.9

  ctx.save()
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
  ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`
  ctx.lineWidth = 4

  if (direction === 'right') {
    const arcX = x + PLAYER_SIZE + 10
    const arcY = y + PLAYER_SIZE / 2
    ctx.beginPath()
    ctx.arc(arcX, arcY, 30, -Math.PI / 3, Math.PI / 3, false)
    ctx.stroke()

    ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`
    ctx.fillRect(x + PLAYER_SIZE, y + 4, progress * 45, 24)

    ctx.strokeStyle = `rgba(200, 200, 255, ${alpha})`
    ctx.beginPath()
    ctx.moveTo(x + PLAYER_SIZE, y + 16)
    ctx.lineTo(x + PLAYER_SIZE + progress * 45, y + 16)
    ctx.stroke()
  } else if (direction === 'left') {
    const arcX = x - 10
    const arcY = y + PLAYER_SIZE / 2
    ctx.beginPath()
    ctx.arc(arcX, arcY, 30, Math.PI * 0.67, Math.PI * 1.33, false)
    ctx.stroke()

    ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`
    ctx.fillRect(x - progress * 45, y + 4, progress * 45, 24)

    ctx.strokeStyle = `rgba(200, 200, 255, ${alpha})`
    ctx.beginPath()
    ctx.moveTo(x, y + 16)
    ctx.lineTo(x - progress * 45, y + 16)
    ctx.stroke()
  } else if (direction === 'up') {
    const arcX = x + PLAYER_SIZE / 2
    const arcY = y - 10
    ctx.beginPath()
    ctx.arc(arcX, arcY, 30, Math.PI * 0.9, Math.PI * 2.1, false)
    ctx.stroke()

    ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`
    ctx.fillRect(x + 4, y - progress * 40, 24, progress * 40)

    ctx.strokeStyle = `rgba(200, 200, 255, ${alpha})`
    ctx.beginPath()
    ctx.moveTo(x + 16, y)
    ctx.lineTo(x + 16, y - progress * 40)
    ctx.stroke()
  }
  ctx.restore()
}

const drawEnemy = (ctx, enemy, time) => {
  if (enemy.dead) return
  const squish = Math.sin(time / 100) * 2
  drawSprite(ctx, ENEMY_SPRITE, enemy.x, enemy.y - squish, 32, {
    1: COLORS.enemy,
    2: '#FF6B6B',
    3: COLORS.enemyInner,
  })
}

const drawBoss = (ctx, boss, time) => {
  if (!boss.active || boss.dead) return

  const squish = Math.sin(time / 150) * 3
  const bossColors = {
    1: '#4A0080',
    2: '#8B008B',
    3: '#9932CC',
    4: '#FF00FF',
  }

  ctx.save()
  if (boss.hitFlash > 0) {
    ctx.globalAlpha = 0.5 + Math.sin(time / 30) * 0.5
  }

  drawSprite(ctx, BOSS_SPRITE, boss.x, boss.y - squish, BOSS_SIZE, bossColors)
  const pixelSize = BOSS_SIZE / BOSS_SPRITE.length

  ctx.fillStyle = '#FFD700'
  ctx.beginPath()
  ctx.moveTo(boss.x + 3 * pixelSize, boss.y - squish + 2 * pixelSize)
  ctx.lineTo(boss.x + 3.5 * pixelSize, boss.y - squish - 1 * pixelSize)
  ctx.lineTo(boss.x + 4.5 * pixelSize, boss.y - squish + 2 * pixelSize)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(boss.x + 5.5 * pixelSize, boss.y - squish + 2 * pixelSize)
  ctx.lineTo(boss.x + 6 * pixelSize, boss.y - squish - 1 * pixelSize)
  ctx.lineTo(boss.x + 7 * pixelSize, boss.y - squish + 2 * pixelSize)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  boss.projectiles.forEach((proj) => {
    ctx.save()
    ctx.fillStyle = '#9932CC'
    ctx.beginPath()
    ctx.arc(proj.x + 6, proj.y + 6, 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#FF00FF'
    ctx.beginPath()
    ctx.arc(proj.x + 6, proj.y + 6, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(153, 50, 204, 0.3)'
    ctx.beginPath()
    ctx.arc(proj.x + 6, proj.y + 6, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}

const drawCoin = (ctx, coin, time) => {
  if (coin.collected) return
  const bounce = Math.sin(time / 200) * 3
  drawSprite(ctx, COIN_SPRITE, coin.x, coin.y + bounce, 24, {
    1: COLORS.coin,
    2: COLORS.coinInner,
    3: '#FFFF00',
  })
}

const drawPowerUpBlock = (ctx, block, time) => {
  const x = block.x
  const y = block.y
  const size = 32

  let shakeX = 0
  if (block.animationTimer > 0) {
    shakeX = Math.sin((block.animationTimer / 300) * Math.PI) * 4
  }

  if (block.active && !block.hit) {
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(x + shakeX, y, size, size)

    ctx.fillStyle = '#B8860B'
    ctx.fillRect(x + shakeX, y, size, 4)
    ctx.fillRect(x + shakeX, y + size - 4, size, 4)
    ctx.fillRect(x + shakeX, y, 4, size)
    ctx.fillRect(x + shakeX + size - 4, y, 4, size)

    ctx.fillStyle = '#8B4513'
    ctx.font = 'bold 24px "Press Start 2P", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('?', x + shakeX + size / 2, y + size / 2 + 2)

    const floatY = Math.sin(time / 300) * 2
    ctx.fillStyle = '#FFA500'
    ctx.fillRect(x + shakeX + 2, y - 4 + floatY, 4, 4)
  } else {
    ctx.fillStyle = '#696969'
    ctx.fillRect(x + shakeX, y, size, size)

    ctx.fillStyle = '#808080'
    ctx.fillRect(x + shakeX, y, size, 4)
    ctx.fillRect(x + shakeX, y + size - 4, size, 4)
    ctx.fillRect(x + shakeX, y, 4, size)
    ctx.fillRect(x + shakeX + size - 4, y, 4, size)

    ctx.fillStyle = '#404040'
    ctx.fillRect(x + shakeX + 8, y + 10, 4, 4)
    ctx.fillRect(x + shakeX + 20, y + 10, 4, 4)
  }
}

const drawSwordItem = (ctx, item) => {
  const x = item.x
  const y = item.y + item.floatOffset

  ctx.save()
  ctx.fillStyle = '#C0C0C0'
  ctx.fillRect(x + 10, y, 4, 16)

  ctx.fillStyle = '#E8E8E8'
  ctx.fillRect(x + 10, y, 4, 4)

  ctx.fillStyle = '#FFD700'
  ctx.fillRect(x + 6, y + 14, 12, 4)

  ctx.fillStyle = '#8B4513'
  ctx.fillRect(x + 10, y + 18, 4, 6)

  ctx.fillStyle = '#FFD700'
  ctx.fillRect(x + 8, y + 22, 8, 4)

  ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'
  ctx.beginPath()
  ctx.arc(x + 12, y + 12, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawMobilePlatform = (ctx, platform) => {
  ctx.fillStyle = '#5A6E8F'
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
  ctx.fillStyle = '#9FB3D9'
  ctx.fillRect(platform.x, platform.y, platform.width, 5)

  if (platform.axis === 'x') {
    const arrowY = platform.y + platform.height / 2
    ctx.strokeStyle = '#D9E5FF'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(platform.x + 10, arrowY)
    ctx.lineTo(platform.x + platform.width - 10, arrowY)
    ctx.stroke()
  }
}

const drawPortal = (ctx, portal, time) => {
  const { x, y, width, height, active, requiresBossDefeat } = portal
  const pulse = Math.sin(time / 180) * 3

  ctx.save()
  ctx.fillStyle = '#1E1E2F'
  ctx.fillRect(x - 6, y - 6, width + 12, height + 12)

  ctx.fillStyle = active ? '#7CFC00' : '#5A5A5A'
  ctx.fillRect(x, y, width, height)

  ctx.fillStyle = active ? '#00F5A0' : '#343434'
  ctx.fillRect(x + 6, y + 8, width - 12, height - 16)

  if (active) {
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#00F5A0'
    ctx.fillRect(x - 4, y - 4, width + 8, height + 8)
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#7CFC00'
    ctx.fillRect(x + 2, y + 2 + pulse, width - 4, height - 4)
    ctx.globalAlpha = 1
  } else if (requiresBossDefeat) {
    ctx.fillStyle = '#FF6347'
    ctx.fillRect(x + width / 2 - 8, y + height - 22, 16, 16)
    ctx.fillStyle = '#2B2B2B'
    ctx.fillRect(x + width / 2 - 2, y + height - 18, 4, 12)
  }

  ctx.restore()
}

const drawCheckpoint = (ctx, checkpoint, time) => {
  const poleTop = checkpoint.y - checkpoint.height
  const poleX = checkpoint.x
  const flutter = Math.sin(time / 140) * 3
  const activeColor = checkpoint.active ? '#00F5A0' : '#7C8A97'
  const flagColor = checkpoint.active ? '#A8FF2F' : '#BCC7D3'

  ctx.save()

  ctx.fillStyle = checkpoint.active ? '#1E7B5C' : '#3B4752'
  ctx.fillRect(poleX - 10, checkpoint.y - 6, 20, 6)

  ctx.fillStyle = activeColor
  ctx.fillRect(poleX - 2, poleTop, 4, checkpoint.height)

  ctx.fillStyle = flagColor
  ctx.fillRect(poleX + 2, poleTop + 6, 16 + flutter, 10)

  if (checkpoint.active) {
    ctx.fillStyle = 'rgba(168, 255, 47, 0.25)'
    ctx.beginPath()
    ctx.arc(poleX + 8, poleTop + 12, 16 + Math.sin(time / 120) * 2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

const drawWorldPlatforms = (ctx, platforms) => {
  platforms.forEach((platform) => {
    if (platform.type === 'ground') {
      ctx.fillStyle = COLORS.grass
      ctx.fillRect(platform.x, platform.y, platform.width, 10)
      ctx.fillStyle = COLORS.ground
      ctx.fillRect(
        platform.x,
        platform.y + 10,
        platform.width,
        platform.height - 10,
      )
      return
    }

    if (platform.type === 'block') {
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
      ctx.fillStyle = '#A0522D'
      for (let i = 0; i < platform.width; i += 20) {
        ctx.fillRect(platform.x + i, platform.y, 18, platform.height - 2)
      }
      return
    }

    ctx.fillStyle = '#8B4513'
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
    ctx.fillStyle = '#228B22'
    ctx.fillRect(platform.x, platform.y, platform.width, 5)
  })
}

export function renderGameScene(ctx, game, timestamp) {
  const { camera, player, platforms, mobilePlatforms, coins, enemies, powerUpBlocks, portal } = game

  const skyColor = LEVEL_SKY_COLORS[game.level] || COLORS.sky
  ctx.fillStyle = skyColor
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  let shakeOffsetX = 0
  let shakeOffsetY = 0
  if (camera.shake.duration > 0) {
    shakeOffsetX = (Math.random() - 0.5) * camera.shake.intensity * 2
    shakeOffsetY = (Math.random() - 0.5) * camera.shake.intensity * 2
  }

  ctx.save()
  ctx.translate(-camera.x + shakeOffsetX, shakeOffsetY)

  drawWorldPlatforms(ctx, platforms)
  mobilePlatforms.forEach((platform) => drawMobilePlatform(ctx, platform))
  if (Array.isArray(game.checkpoints)) {
    game.checkpoints.forEach((checkpoint) => drawCheckpoint(ctx, checkpoint, timestamp))
  }
  if (portal) {
    drawPortal(ctx, portal, timestamp)
  }
  coins.forEach((coin) => drawCoin(ctx, coin, timestamp))
  enemies.forEach((enemy) => drawEnemy(ctx, enemy, timestamp))

  drawBoss(ctx, game.boss, timestamp)
  powerUpBlocks.forEach((block) => drawPowerUpBlock(ctx, block, timestamp))

  if (game.swordItem && !game.swordItem.collected) {
    drawSwordItem(ctx, game.swordItem)
  }
  if (game.bowItem && !game.bowItem.collected) {
    drawBowItem(ctx, game.bowItem, timestamp)
  }

  game.arrows.forEach((arrow) => drawArrow(ctx, arrow))
  game.arrowImpacts.forEach((impact) => {
    ctx.save()
    ctx.globalAlpha = impact.life / impact.maxLife
    ctx.fillStyle = impact.color
    ctx.fillRect(impact.x, impact.y, impact.size, impact.size)
    ctx.restore()
  })

  game.particles.forEach((particle) => {
    ctx.save()
    ctx.globalAlpha = particle.life / particle.maxLife
    ctx.fillStyle = particle.color
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size)
    ctx.restore()
  })

  drawPlayer(ctx, player, game.dashState, timestamp)
  if (player.isAttacking && player.attackDirection) {
    drawSwordAttack(ctx, player, player.attackDirection, player.attackTimer)
  }

  ctx.restore()
}

export function getPlayerAttackHitbox(player, direction) {
  return getAttackHitbox(player, direction, PLAYER_SIZE)
}
