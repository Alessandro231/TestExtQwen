import { useState, useEffect, useCallback, useRef } from 'react'
import { loadLevel, hasNextLevel, getNextLevel, LEVELS } from './levels'
import {
  createMobilePlatforms,
  updateMobilePlatforms,
  resolvePlayerOnMobilePlatforms,
  isPlayerCrushedByMobilePlatform,
  resolveEnemyPlatformTransport,
} from './mobilePlatforms'

const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 480
const PLAYER_SIZE = 32
const GRAVITY = 0.6
const JUMP_FORCE = -12
const MOVE_SPEED = 5
const DASH_SPEED = 18
const DASH_DURATION = 150
const MAX_DASH_CHARGES = 3
const DASH_RECHARGE_TIME = 2000
const DAMAGE_INVULN_TIME = 1000

// Constantes del sistema de espada
const SWORD_DURATION = 10000        // 10 segundos total
const SWORD_WARNING_TIME = 3000     // 3 segundos: advertencia amarilla
const SWORD_CRITICAL_TIME = 1000    // 1 segundo: advertencia roja, sin ataque
const ATTACK_DURATION = 200         // ms que el hitbox está activo
const ATTACK_COOLDOWN = 300         // ms entre ataques
const ATTACK_POINTS = 200           // Puntos por enemigo

// Constantes del sistema de arco
const MAX_ARROWS = 20               // Capacidad máxima de flechas
const START_ARROWS = 10             // Flechas al recoger el arco
const ARROW_SPEED = 12              // Velocidad del proyectil (px/frame)
const ARROW_MAX_DISTANCE = 400      // Alcance máximo horizontal
const ARROW_STUCK_TIME = 3000       // Tiempo clavada en plataforma (ms)
const SHOOT_COOLDOWN = 250          // ms entre disparos
const ARROW_POINTS = 150            // Puntos por enemigo eliminado con flecha

// Constantes del Boss
const BOSS_MAX_HP = 5               // Vida total del Jefe
const BOSS_ATTACK_COOLDOWN = 1800    // ms entre disparos del Jefe
const BOSS_SIZE = 64                // Doble de un enemigo normal
const BOSS_PROJECTILE_SPEED = 6     // Velocidad de los disparos del Jefe
const BOSS_POINTS = 5000            // Recompensa final
const BOSS_JUMP_FORCE = -14         // Fuerza de salto del Boss
const BOSS_MOVE_SPEED = 2           // Velocidad de movimiento horizontal del Boss
const BOSS_AGGRO_RANGE = 400        // Rango de detección del jugador
const BOSS_JUMP_INTERVAL = 2000    // Intervalo entre saltos aleatorios (ms)
const BOSS_SPRITE = [               // Sprite del Boss (versión ampliada del enemigo)
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
// Sprites 8-bit simplificados (1 = pixel, 0 = transparente)
const PLAYER_SPRITE = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 1, 3, 3, 1, 1, 0],
  [0, 1, 3, 3, 3, 3, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
]

const COIN_SPRITE = [
  [0, 1, 1, 1, 1, 0],
  [1, 2, 2, 2, 2, 1],
  [1, 2, 3, 3, 2, 1],
  [1, 2, 2, 2, 2, 1],
  [0, 1, 1, 1, 1, 0],
]

const ENEMY_SPRITE = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [1, 2, 3, 3, 3, 3, 2, 1],
  [1, 2, 3, 1, 1, 3, 2, 1],
  [1, 2, 3, 3, 3, 3, 2, 1],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
]

// Colores estilo 8-bit
const COLORS = {
  1: '#5D9CEC', // Azul claro
  2: '#4A89DC', // Azul medio
  3: '#326FB5', // Azul oscuro
  sky: '#87CEEB',
  ground: '#8B4513',
  grass: '#228B22',
  coin: '#FFD700',
  coinInner: '#FFA500',
  enemy: '#DC143C',
  enemyInner: '#8B0000',
}

// Colores por nivel para el cielo
const LEVEL_SKY_COLORS = {
  1: '#87CEEB', // Verde hills - cielo azul claro
  2: '#FFB6C1', // Sky fortress - cielo rosado
  3: '#2C3E50', // Dark castle - cielo oscuro
}

function App() {
  const canvasRef = useRef(null)
  const [gameState, setGameState] = useState('start')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [dashCharges, setDashCharges] = useState(MAX_DASH_CHARGES)
  const [level, setLevel] = useState(1)
  const [levelName, setLevelName] = useState('')

  // Estados para la barra de vida del Boss
  const [bossHP, setBossHP] = useState(BOSS_MAX_HP)
  const [bossActive, setBossActive] = useState(false)

  const gameRef = useRef({
    player: {
      x: 50, y: 300, vx: 0, vy: 0, onGround: false, facingRight: true,
      isDashing: false, dashTimer: 0,
      // Estados de la espada
      hasSword: false,
      swordTimer: 0,
      swordActive: false,
      isAttacking: false,
      attackDirection: null,
      attackCooldown: 0,
      // Estados del arco
      hasBow: false,
      bowTimer: 0,
      bowActive: false,
      arrows: 0,
      isShooting: false,
      shootCooldown: 0,
    },
    dashState: { charges: MAX_DASH_CHARGES, rechargeTimer: 0, hasDashed: false, trail: [] },
    keys: {},
    platforms: [],
    mobilePlatforms: [],
    coins: [],
    enemies: [],
    powerUpBlocks: [],
    swordItem: null,
    bowItem: null,
    arrows: [],
    arrowImpacts: [],
    particles: [], // Sistema de partículas global
    camera: { x: 0, shake: { intensity: 0, duration: 0 } },
    levelWidth: 2000,
    level: 1, // Atajo para evitar closure bugs
    boss: {
      active: false,
      hp: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      onGround: false,
      attackCooldown: 0,
      projectiles: [],
      dead: false,
      hitFlash: 0,
    },
  })

  // Estados React para UI de espada
  const [swordTimeLeft, setSwordTimeLeft] = useState(0)
  const [swordActive, setSwordActive] = useState(false)
  const [playerRefHasSword, setPlayerRefHasSword] = useState(false)

  // Estados React para UI de arco (solo contador de flechas)
  const [playerRefHasBow, setPlayerRefHasBow] = useState(false)
  const [arrowCount, setArrowCount] = useState(0)

  // Inicializar nivel desde archivo externo
  const initLevel = useCallback((lvlId) => {
    const levelData = loadLevel(lvlId)
    const game = gameRef.current
    game.level = lvlId // Sincronizar ref con el ID de nivel
    setLevel(lvlId) // Actualizar estado para UI

    game.player = {
      x: levelData.spawnPoint.x,
      y: levelData.spawnPoint.y,
      vx: 0,
      vy: 0,
      onGround: false,
      facingRight: true,
      isDashing: false,
      dashTimer: 0,
      hasSword: false,
      swordTimer: 0,
      swordActive: false,
      isAttacking: false,
      attackDirection: null,
      attackCooldown: 0,
      attackTimer: 0,
      hasBow: false,
      arrows: 0,
      isShooting: false,
      shootCooldown: 0,
      supportVelocityX: 0,
      supportedByMobileId: null,
      damageInvuln: 0,
    }
    game.dashState = { charges: MAX_DASH_CHARGES, rechargeTimer: 0, hasDashed: false, trail: [] }
    setDashCharges(MAX_DASH_CHARGES)
    game.camera = { x: 0, shake: { intensity: 0, duration: 0 } }
    game.levelWidth = levelData.levelWidth

    // Cargar plataformas
    game.platforms = levelData.platforms
    game.mobilePlatforms = createMobilePlatforms(levelData.mobilePlatforms)

    // Cargar monedas (con estado collected)
    game.coins = levelData.coins.map(coin => ({ ...coin, collected: false }))

    // Cargar enemigos
    game.enemies = levelData.enemies.map(enemy => ({
      ...enemy,
      dead: false,
      hitBySword: false
    }))

    // Cargar bloques ? (power-ups)
    game.powerUpBlocks = levelData.powerUpBlocks ? levelData.powerUpBlocks.map(block => ({
      ...block,
      hit: false,
      animationFrame: 0,
      animationTimer: 0,
    })) : []

    // Item espada (null si no hay ninguno activo)
    game.swordItem = null
    game.bowItem = null
    game.arrows = []
    game.arrowImpacts = []

    // Limpiar impactos al daño
    game.arrowImpacts = []

    // Resetear estados de espada en el jugador
    game.player.hasSword = false
    game.player.swordTimer = 0
    game.player.swordActive = false

    // Resetear estados de arco en el jugador
    game.player.hasBow = false
    game.player.arrows = 0

    setSwordTimeLeft(0)
    setSwordActive(false)
    setPlayerRefHasBow(false)
    setArrowCount(0)

    // Configurar Boss si el nivel lo tiene
    if (levelData.boss) {
      game.boss = {
        active: true,
        hp: BOSS_MAX_HP,
        x: levelData.boss.x,
        y: levelData.boss.y,
        vx: 0,
        vy: 0,
        onGround: false,
        attackCooldown: BOSS_ATTACK_COOLDOWN,
        projectiles: [],
        dead: false,
        hitFlash: 0,
      }
    } else {
      game.boss.active = false
    }

    setLevelName(levelData.name)
  }, [])

  // Actualizar Boss (función interna para acceder a bossStateRef)
  const updateBossInternal = useCallback((game, deltaTime) => {
    const { boss, player, platforms, arrows } = game

    if (!boss.active || boss.dead) return

    const distToPlayerX = Math.abs(player.x - boss.x)
    const distToPlayerY = player.y - boss.y

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
    } else {
      if (boss.onGround) {
        boss.vx = 0
      }
    }

    if (boss.jumpTimer > 0) {
      boss.jumpTimer -= deltaTime
    }

    boss.vy += GRAVITY * 0.8
    boss.x += boss.vx
    boss.y += boss.vy

    platforms.forEach(platform => {
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
    if (boss.x > game.levelWidth - BOSS_SIZE) boss.x = game.levelWidth - BOSS_SIZE

    if (boss.attackCooldown > 0) {
      boss.attackCooldown -= deltaTime
    }

    if (boss.attackCooldown <= 0 && distToPlayerX < BOSS_AGGRO_RANGE) {
      const dirX = player.x + PLAYER_SIZE / 2 - (boss.x + BOSS_SIZE / 2)
      const dirY = player.y + PLAYER_SIZE / 2 - (boss.y + BOSS_SIZE / 2)
      const dist = Math.sqrt(dirX * dirX + dirY * dirY)

      boss.projectiles.push({
        x: boss.x + BOSS_SIZE / 2 - 6,
        y: boss.y + BOSS_SIZE / 2 - 6,
        vx: (dirX / dist) * BOSS_PROJECTILE_SPEED,
        vy: (dirY / dist) * BOSS_PROJECTILE_SPEED,
        life: 3000,
      })

      boss.attackCooldown = BOSS_ATTACK_COOLDOWN
    }

    boss.projectiles.forEach(proj => {
      proj.x += proj.vx
      proj.y += proj.vy
      proj.vy += 0.15
      proj.life -= deltaTime
    })

    boss.projectiles = boss.projectiles.filter(p => p.life > 0 && p.x > -50 && p.x < game.levelWidth + 50 && p.y < CANVAS_HEIGHT + 50)

    if (player.isAttacking && player.attackDirection) {
      const hitbox = getAttackHitbox(player, player.attackDirection)
      if (
        hitbox.x < boss.x + BOSS_SIZE &&
        hitbox.x + hitbox.width > boss.x &&
        hitbox.y < boss.y + BOSS_SIZE &&
        hitbox.y + hitbox.height > boss.y &&
        !boss.hitFlash
      ) {
        boss.hp--
        boss.hitFlash = 200
        setBossHP(boss.hp)
        setScore(prev => prev + 100)

        for (let i = 0; i < 12; i++) {
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
          setBossHP(0)
          setBossActive(false)
          setScore(prev => prev + BOSS_POINTS)
          setGameState('win')
        }
      }
    }

    arrows.forEach(arrow => {
      if (!arrow.stuck && !arrow.hitEnemy && !arrow.hitBoss) {
        if (
          arrow.x < boss.x + BOSS_SIZE &&
          arrow.x + 24 > boss.x &&
          arrow.y < boss.y + BOSS_SIZE &&
          arrow.y + 8 > boss.y
        ) {
          arrow.hitBoss = true
          arrow.hitEnemy = true
          boss.hp--
          boss.hitFlash = 200
          setScore(prev => prev + 150)

          for (let i = 0; i < 8; i++) {
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
            setScore(prev => prev + BOSS_POINTS)
            setGameState('win')
          }
        }
      }
    })

    if (boss.hitFlash > 0) {
      boss.hitFlash -= deltaTime
    }
  }, [setBossHP, setBossActive, setScore, setGameState])

  // Dibujar sprite pixelado
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
            pixelSize
          )
        }
      })
    })
  }

  // Dibujar jugador
  const drawPlayer = (ctx, player, dashState, timestamp) => {
    // Dibujar after-images
    dashState.trail.forEach(t => {
      ctx.save()
      ctx.globalAlpha = t.alpha
      if (!t.facingRight) {
        ctx.translate(t.x + PLAYER_SIZE, t.y)
        ctx.scale(-1, 1)
        drawSprite(ctx, PLAYER_SPRITE, 0, 0, PLAYER_SIZE, { ...COLORS, 1: '#00FFFF', 2: '#87CEEB', 3: '#4682B4' })
      } else {
        drawSprite(ctx, PLAYER_SPRITE, t.x, t.y, PLAYER_SIZE, { ...COLORS, 1: '#00FFFF', 2: '#87CEEB', 3: '#4682B4' })
      }
      ctx.restore()
    })

    // Hacer parpadear al original si está en dash (faseando)
    if (player.isDashing && Math.floor(timestamp / 30) % 2 === 0) {
      return
    }

    ctx.save()
    if (!player.facingRight) {
      ctx.translate(player.x + PLAYER_SIZE, player.y)
      ctx.scale(-1, 1)
      drawSprite(ctx, PLAYER_SPRITE, 0, 0, PLAYER_SIZE, COLORS)

      if (player.hasSword) {
        drawEquippedSword(ctx, 0, 0, true, timestamp)
      }
      if (player.hasBow) {
        drawEquippedBow(ctx, 0, 0, true, timestamp)
      }
    } else {
      drawSprite(ctx, PLAYER_SPRITE, player.x, player.y, PLAYER_SIZE, COLORS)

      if (player.hasSword) {
        drawEquippedSword(ctx, player.x, player.y, true, timestamp)
      }
      if (player.hasBow) {
        drawEquippedBow(ctx, player.x, player.y, true, timestamp)
      }
    }

    ctx.restore()
  }

  // Dibujar espada equipada en el jugador
  const drawEquippedSword = (ctx, x, y, facingRight, time) => {
    const size = 32

    // Animación de flotación suave de la espada
    const floatY = Math.sin(time / 200) * 2

    ctx.save()

    // Espada apuntando hacia la derecha (posición de reposo)
    const swordX = x + size - 4
    const swordY = y + 12 + floatY

    // Hoja de la espada
    ctx.fillStyle = '#C0C0C0'  // Plateado
    ctx.fillRect(swordX, swordY, 16, 4)

    // Punta
    ctx.fillStyle = '#E8E8E8'
    ctx.fillRect(swordX + 14, swordY, 4, 4)

    // Guarda
    ctx.fillStyle = '#FFD700'  // Dorado
    ctx.fillRect(swordX - 2, swordY - 4, 6, 12)

    // Mango
    ctx.fillStyle = '#8B4513'  // Marrón
    ctx.fillRect(swordX - 6, swordY - 2, 6, 6)

    // Brillo de la espada
    ctx.fillStyle = 'rgba(255, 215, 0, 0.2)'
    ctx.beginPath()
    ctx.arc(x + size/2, y + 16 + floatY, 20, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  // Dibujar arco equipado en el jugador
  const drawEquippedBow = (ctx, x, y, facingRight, time) => {
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
    ctx.arc(x + size/2, y + 16 + floatY, 20, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  // Dibujar item arco flotante
  const drawBowItem = (ctx, item, time) => {
    const x = item.x
    const y = item.y + item.floatOffset

    ctx.save()

    const floatY = Math.sin(time / 200) * 2

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

  // Dibujar flecha (proyectil)
  const drawArrow = (ctx, arrow) => {
    const x = arrow.x
    const y = arrow.y

    ctx.save()

    if (arrow.stuck) {
      ctx.globalAlpha = arrow.stuckAlpha || 0.8
    }

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

  // Obtener hitbox de ataque según dirección
  const getAttackHitbox = (player, direction) => {
    const x = player.x
    const y = player.y

    if (direction === 'right') {
      return { x: x + PLAYER_SIZE, y: y + 4, width: 40, height: 24 }
    } else if (direction === 'left') {
      return { x: x - 40, y: y + 4, width: 40, height: 24 }
    } else if (direction === 'up') {
      return { x: x, y: y - 32, width: 32, height: 32 }
    }
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  // Dibujar hitbox de ataque (para debug)
  const drawAttackHitbox = (ctx, player, direction) => {
    if (!player.isAttacking) return

    const hitbox = getAttackHitbox(player, direction)
    ctx.save()
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
    ctx.fillRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height)
    ctx.restore()
  }

  // Dibujar efecto visual de ataque de espada
  const drawSwordAttack = (ctx, player, direction, timer) => {
    const x = player.x
    const y = player.y
    const progress = timer / ATTACK_DURATION  // 1.0 a 0.0

    ctx.save()

    // Color del efecto (blanco brillante al inicio, se desvanece)
    const alpha = Math.max(0.3, progress) * 0.9
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`
    ctx.lineWidth = 4

    if (direction === 'right') {
      // Arco de ataque hacia la derecha
      const arcX = x + PLAYER_SIZE + 10
      const arcY = y + PLAYER_SIZE / 2

      // Arco principal
      ctx.beginPath()
      ctx.arc(arcX, arcY, 30, -Math.PI / 3, Math.PI / 3, false)
      ctx.stroke()

      // Rastro del ataque (se expande)
      ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`
      ctx.fillRect(x + PLAYER_SIZE, y + 4, progress * 45, 24)

      // Línea de la espada
      ctx.strokeStyle = `rgba(200, 200, 255, ${alpha})`
      ctx.beginPath()
      ctx.moveTo(x + PLAYER_SIZE, y + 16)
      ctx.lineTo(x + PLAYER_SIZE + progress * 45, y + 16)
      ctx.stroke()

    } else if (direction === 'left') {
      // Arco de ataque hacia la izquierda
      const arcX = x - 10
      const arcY = y + PLAYER_SIZE / 2

      // Arco
      ctx.beginPath()
      ctx.arc(arcX, arcY, 30, Math.PI * 0.67, Math.PI * 1.33, false)
      ctx.stroke()

      // Rastro
      ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`
      ctx.fillRect(x - progress * 45, y + 4, progress * 45, 24)

      // Línea
      ctx.strokeStyle = `rgba(200, 200, 255, ${alpha})`
      ctx.beginPath()
      ctx.moveTo(x, y + 16)
      ctx.lineTo(x - progress * 45, y + 16)
      ctx.stroke()

    } else if (direction === 'up') {
      // Arco de ataque hacia arriba
      const arcX = x + PLAYER_SIZE / 2
      const arcY = y - 10

      // Arco
      ctx.beginPath()
      ctx.arc(arcX, arcY, 30, Math.PI * 0.9, Math.PI * 2.1, false)
      ctx.stroke()

      // Rastro
      ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`
      ctx.fillRect(x + 4, y - progress * 40, 24, progress * 40)

      // Línea
      ctx.strokeStyle = `rgba(200, 200, 255, ${alpha})`
      ctx.beginPath()
      ctx.moveTo(x + 16, y)
      ctx.lineTo(x + 16, y - progress * 40)
      ctx.stroke()
    }

    ctx.restore()
  }

  // Dibujar enemigo
  const drawEnemy = (ctx, enemy, time, timestamp) => {
    if (enemy.dead) return  // No dibujar si está muerto

    const squish = Math.sin(time / 100) * 2
    drawSprite(ctx, ENEMY_SPRITE, enemy.x, enemy.y - squish, 32, {
      1: COLORS.enemy,
      2: '#FF6B6B',
      3: COLORS.enemyInner,
    })
  }

  // Dibujar Boss
  const drawBoss = (ctx, boss, time) => {
    if (!boss.active || boss.dead) return

    const squish = Math.sin(time / 150) * 3
    const bossColors = {
      1: '#4A0080',  // Púrpura oscuro
      2: '#8B008B',  // Magenta
      3: '#9932CC',  // Púrpura brillante
      4: '#FF00FF',  // Magenta brillante (ojos/joyas)
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

    boss.projectiles.forEach(proj => {
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

  // Función para crear partículas (vfx)
  const spawnParticles = (x, y, count, color, speedScale = 1) => {
    const game = gameRef.current
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = (Math.random() * 4 + 2) * speedScale
      game.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500 + Math.random() * 500,
        maxLife: 1000,
        size: Math.random() * 4 + 2,
        color: color
      })
    }
  }

  // Las funciones duplicadas (updateBoss, drawBossBar) han sido unificadas o eliminadas

  // Función para activar el Screen Shake
  const triggerShake = (intensity, duration) => {
    const game = gameRef.current
    game.camera.shake.intensity = intensity
    game.camera.shake.duration = duration
  }

  // Dibujar moneda
  const drawCoin = (ctx, coin, time) => {
    if (coin.collected) return
    const bounce = Math.sin(time / 200) * 3
    drawSprite(ctx, COIN_SPRITE, coin.x, coin.y + bounce, 24, {
      1: COLORS.coin,
      2: COLORS.coinInner,
      3: '#FFFF00',
    })
  }

  // Dibujar bloque ? (power-up)
  const drawPowerUpBlock = (ctx, block, time) => {
    const x = block.x
    const y = block.y
    const size = 32

    // Animación de shake después de golpear
    let shakeX = 0
    if (block.animationTimer > 0) {
      shakeX = Math.sin((block.animationTimer / 300) * Math.PI) * 4
    }

    if (block.active && !block.hit) {
      // Bloque ? activo - dorado con signo de interrogación
      ctx.fillStyle = '#FFD700'  // Dorado
      ctx.fillRect(x + shakeX, y, size, size)

      // Borde más oscuro
      ctx.fillStyle = '#B8860B'
      ctx.fillRect(x + shakeX, y, size, 4)  // Top
      ctx.fillRect(x + shakeX, y + size - 4, size, 4)  // Bottom
      ctx.fillRect(x + shakeX, y, 4, size)  // Left
      ctx.fillRect(x + shakeX + size - 4, y, 4, size)  // Right

      // Signo de interrogación
      ctx.fillStyle = '#8B4513'
      ctx.font = 'bold 24px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', x + shakeX + size / 2, y + size / 2 + 2)

      // Animación de flotación suave
      const floatY = Math.sin(time / 300) * 2
      ctx.fillStyle = '#FFA500'
      ctx.fillRect(x + shakeX + 2, y - 4 + floatY, 4, 4)
    } else {
      // Bloque usado - gris vacío
      ctx.fillStyle = '#696969'  // Gris oscuro
      ctx.fillRect(x + shakeX, y, size, size)

      // Borde más claro
      ctx.fillStyle = '#808080'
      ctx.fillRect(x + shakeX, y, size, 4)
      ctx.fillRect(x + shakeX, y + size - 4, size, 4)
      ctx.fillRect(x + shakeX, y, 4, size)
      ctx.fillRect(x + shakeX + size - 4, y, 4, size)

      // Puntos vacíos
      ctx.fillStyle = '#404040'
      ctx.fillRect(x + shakeX + 8, y + 10, 4, 4)
      ctx.fillRect(x + shakeX + 20, y + 10, 4, 4)
    }
  }

  // Dibujar item espada flotante
  const drawSwordItem = (ctx, item, time) => {
    const x = item.x
    const y = item.y + item.floatOffset
    const size = 24

    // Espada simple pixel-art
    ctx.save()

    // Hoja de la espada
    ctx.fillStyle = '#C0C0C0'  // Plateado
    ctx.fillRect(x + 10, y, 4, 16)

    // Punta de la espada
    ctx.fillStyle = '#E8E8E8'
    ctx.fillRect(x + 10, y, 4, 4)

    // Guarda de la espada
    ctx.fillStyle = '#FFD700'  // Dorado
    ctx.fillRect(x + 6, y + 14, 12, 4)

    // Mango de la espada
    ctx.fillStyle = '#8B4513'  // Marrón
    ctx.fillRect(x + 10, y + 18, 4, 6)

    // Pomelo
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(x + 8, y + 22, 8, 4)

    // Brillo de flotación
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

    // Flechas para reforzar lectura de dirección horizontal
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

  // Loop del juego
  useEffect(() => {
    if (gameState !== 'playing') return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const game = gameRef.current

    let animationId
    let lastTime = 0

    const update = (timestamp) => {
      const deltaTime = lastTime === 0 ? 16.67 : timestamp - lastTime
      lastTime = timestamp

      const { player, keys, platforms, mobilePlatforms, coins, enemies, camera, levelWidth, powerUpBlocks, swordItem, bowItem, arrows } = game

      const applyPlayerDamage = () => {
        if (player.damageInvuln > 0) return

        setLives(prev => {
          const newLives = prev - 1
          if (newLives <= 0) {
            setGameState('gameover')
          } else {
            player.x = 50
            player.y = 300
            player.vx = 0
            player.vy = 0
            player.supportVelocityX = 0
            player.supportedByMobileId = null
            player.damageInvuln = DAMAGE_INVULN_TIME
            game.dashState.charges = MAX_DASH_CHARGES
            setDashCharges(MAX_DASH_CHARGES)
            player.isDashing = false
            // Perder espada al recibir daño
            player.hasSword = false
            player.swordTimer = 0
            player.swordActive = false
            setSwordTimeLeft(0)
            setSwordActive(false)
            setPlayerRefHasSword(false)
            // Perder arco al recibir daño
            player.hasBow = false
            player.arrows = 0
            game.arrows = []
            game.arrowImpacts = []
            setPlayerRefHasBow(false)
            setArrowCount(0)
          }
          return newLives
        })
      }

      if (player.damageInvuln > 0) {
        player.damageInvuln = Math.max(0, player.damageInvuln - deltaTime)
      }

      // Procesar Screen Shake
      if (game.camera.shake.duration > 0) {
        game.camera.shake.duration -= deltaTime
        if (game.camera.shake.duration <= 0) {
          game.camera.shake.intensity = 0
        }
      }

      // Procesar Hit Flash del Boss
      if (game.boss.active && game.boss.hitFlash > 0) {
        game.boss.hitFlash -= deltaTime
      }

      updateMobilePlatforms(deltaTime, mobilePlatforms)

      // Timer de la espada (si está activa)
      if (player.hasSword && player.swordTimer > 0) {
        player.swordTimer -= deltaTime
        if (player.swordTimer <= 0) {
          // Espada se acaba
          player.hasSword = false
          player.swordActive = false
          setSwordTimeLeft(0)
          setSwordActive(false)
          setPlayerRefHasSword(false)
        } else {
          // Actualizar UI
          const timeLeft = player.swordTimer / 1000
          setSwordTimeLeft(timeLeft)
          // Último segundo: no puede atacar
          player.swordActive = player.swordTimer >= 1000
          setSwordActive(player.swordActive)
          setPlayerRefHasSword(true)
        }
      } else if (player.hasSword) {
        setPlayerRefHasSword(true)
      }

      // Actualizar estado del arco (indefinido hasta que se acaben las flechas)
      if (player.hasBow) {
        setPlayerRefHasBow(true)
        setArrowCount(player.arrows)

        // Si se acaban las flechas, perder el arco
        if (player.arrows <= 0) {
          player.hasBow = false
          player.bowActive = false
          setPlayerRefHasBow(false)
          setArrowCount(0)
        }
      }

      // Cooldown de disparo
      if (player.shootCooldown > 0) {
        player.shootCooldown -= deltaTime
      }

      // Input de disparo con arco (tecla C)
      if (player.hasBow && player.arrows > 0 && (keys['c'] || keys['C']) && player.shootCooldown <= 0) {
        const startX = player.x + (player.facingRight ? PLAYER_SIZE : -8)
        const startY = player.y + 12

        let vx = 0
        let vy = 0

        if (keys['ArrowUp'] || keys['w']) {
          vx = player.facingRight ? ARROW_SPEED * 0.7 : -ARROW_SPEED * 0.7
          vy = -ARROW_SPEED * 0.7
        } else if (keys['ArrowDown'] || keys['s']) {
          vx = player.facingRight ? ARROW_SPEED * 0.7 : -ARROW_SPEED * 0.7
          vy = ARROW_SPEED * 0.5
        } else {
          vx = player.facingRight ? ARROW_SPEED : -ARROW_SPEED
        }

        game.arrows.push({
          x: startX,
          y: startY,
          vx: vx,
          vy: vy,
          startX: startX,
          stuck: false,
          stuckTimer: 0,
          stuckAlpha: 1,
          hitEnemy: false,
        })

        player.arrows--
        player.shootCooldown = SHOOT_COOLDOWN
        setArrowCount(player.arrows)
      }

      // Cooldown de ataque
      if (player.attackCooldown > 0) {
        player.attackCooldown -= deltaTime
      }

      // Input de ataque con espada (tecla Z o X)
      if (player.hasSword && player.swordActive && (keys['z'] || keys['Z'] || keys['x'] || keys['X']) && player.attackCooldown <= 0) {
        // Determinar dirección del ataque
        let attackDir = null
        if (keys['ArrowRight'] || keys['d']) {
          attackDir = 'right'
          player.facingRight = true
        } else if (keys['ArrowLeft'] || keys['a']) {
          attackDir = 'left'
          player.facingRight = false
        } else if (keys['ArrowUp'] || keys['w']) {
          attackDir = 'up'
        } else {
          // Dirección por defecto: hacia donde mira
          attackDir = player.facingRight ? 'right' : 'left'
        }

        // Iniciar ataque
        player.isAttacking = true
        player.attackDirection = attackDir
        player.attackTimer = ATTACK_DURATION
        player.attackCooldown = ATTACK_COOLDOWN
      }

      // Timer del ataque
      if (player.isAttacking && player.attackTimer > 0) {
        player.attackTimer -= deltaTime
        if (player.attackTimer <= 0) {
          player.isAttacking = false
          player.attackDirection = null
        }
      }

      // Animación de bloques ? golpeados
      powerUpBlocks.forEach(block => {
        if (block.animationTimer > 0) {
          block.animationTimer -= deltaTime
          if (block.animationTimer <= 0) {
            block.animationFrame = 0
          }
        }
      })

      // Recoger item espada
      if (game.swordItem && !game.swordItem.collected) {
        const item = game.swordItem
        // Actualizar flotación
        item.floatTimer += deltaTime
        item.floatOffset = Math.sin(item.floatTimer / 200) * 5

        // Verificar colisión con jugador
        if (
          player.x < item.x + 24 &&
          player.x + PLAYER_SIZE > item.x &&
          player.y < item.y + 24 &&
          player.y + PLAYER_SIZE > item.y
        ) {
          // ¡Recogida!
          item.collected = true
          player.hasSword = true
          player.swordTimer = 10000  // 10 segundos
          player.swordActive = true
          game.swordItem = null
          setSwordTimeLeft(10)
          setSwordActive(true)
        }
      }

      // Recoger item arco
      if (game.bowItem && !game.bowItem.collected) {
        const item = game.bowItem
        item.floatTimer += deltaTime
        item.floatOffset = Math.sin(item.floatTimer / 200) * 5

        if (
          player.x < item.x + 24 &&
          player.x + PLAYER_SIZE > item.x &&
          player.y < item.y + 24 &&
          player.y + PLAYER_SIZE > item.y
        ) {
          // ¡Recogida!
          item.collected = true
          player.hasBow = true
          player.arrows = START_ARROWS
          game.bowItem = null
          setPlayerRefHasBow(true)
          setArrowCount(START_ARROWS)
        }
      }

      // Movimiento del jugador
      if (player.isDashing) {
        player.dashTimer -= deltaTime
        if (player.dashTimer <= 0) {
          player.isDashing = false
        } else {
          player.vy = 0 // Sin gravedad en el dash
          player.vx = player.facingRight ? DASH_SPEED : -DASH_SPEED
          
          // Crear rastro
          game.dashState.trail.push({ x: player.x, y: player.y, facingRight: player.facingRight, alpha: 0.5 })
        }
      } else {
        if (keys['ArrowLeft'] || keys['a']) {
          player.vx = -MOVE_SPEED
          player.facingRight = false
        } else if (keys['ArrowRight'] || keys['d']) {
          player.vx = MOVE_SPEED
          player.facingRight = true
        } else {
          player.vx = 0
        }

        // Salto
        if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && player.onGround) {
          player.vy = JUMP_FORCE
          player.onGround = false
          player.vx += player.supportVelocityX || 0
          player.supportVelocityX = 0
          player.supportedByMobileId = null
        }
      }

      // Input y control del Dash
      if (keys['Shift'] && game.dashState.charges > 0 && !player.isDashing && !game.dashState.hasDashed) {
        game.dashState.charges--
        setDashCharges(game.dashState.charges)
        player.isDashing = true
        player.dashTimer = DASH_DURATION
        game.dashState.hasDashed = true
      }
      if (!keys['Shift']) {
        game.dashState.hasDashed = false
      }

      // Recarga de Dash
      if (game.dashState.charges < MAX_DASH_CHARGES && !player.isDashing) {
        game.dashState.rechargeTimer += deltaTime
        if (game.dashState.rechargeTimer >= DASH_RECHARGE_TIME) {
          game.dashState.charges++
          game.dashState.rechargeTimer = 0
          setDashCharges(game.dashState.charges)
        }
      } else if (player.isDashing) {
        game.dashState.rechargeTimer = 0 // No recarga mientras se desliza
      }

      // Difuminar rastro (trail)
      game.dashState.trail.forEach(t => t.alpha -= 0.05 * (deltaTime / 16))
      game.dashState.trail = game.dashState.trail.filter(t => t.alpha > 0)

      // Gravedad
      if (!player.isDashing) {
        player.vy += GRAVITY
      }

      // Aplicar velocidad
      player.x += player.vx
      player.y += player.vy

      // Límites del nivel
      if (player.x < 0) player.x = 0
      if (player.x > levelWidth - PLAYER_SIZE) player.x = levelWidth - PLAYER_SIZE

      // Colisión con plataformas
      player.onGround = false
      platforms.forEach(platform => {
        if (
          player.x < platform.x + platform.width &&
          player.x + PLAYER_SIZE > platform.x &&
          player.y + PLAYER_SIZE > platform.y &&
          player.y + PLAYER_SIZE < platform.y + platform.height &&
          player.vy >= 0
        ) {
          player.y = platform.y - PLAYER_SIZE
          player.vy = 0
          player.onGround = true
        }
      })

      // Contacto con plataformas móviles (arrastre automático)
      resolvePlayerOnMobilePlatforms(player, mobilePlatforms, PLAYER_SIZE)

      // Mantener al jugador dentro de los límites tras el arrastre
      if (player.x < 0) player.x = 0
      if (player.x > levelWidth - PLAYER_SIZE) player.x = levelWidth - PLAYER_SIZE

      // Aplastamiento por plataforma móvil contra sólidos estáticos
      if (
        player.damageInvuln <= 0 &&
        isPlayerCrushedByMobilePlatform(player, mobilePlatforms, platforms, PLAYER_SIZE)
      ) {
        applyPlayerDamage()
      }

      // Colisión con bloques ? (golpear desde abajo)
      powerUpBlocks.forEach(block => {
        if (!block.hit && !block.active) {
          // Bloque ya usado, solo colisión sólida
          if (
            player.x < block.x + 32 &&
            player.x + PLAYER_SIZE > block.x &&
            player.y < block.y + 32 &&
            player.y + PLAYER_SIZE > block.y
          ) {
            // Colisión desde abajo
            if (player.vy < 0 && player.y > block.y + 16) {
              player.y = block.y + 32
              player.vy = 0
              // Animación de golpe
              block.animationFrame = 1
              block.animationTimer = 300
            }
          }
        } else if (block.active && !block.hit) {
          // Bloque activo - verificar golpe desde abajo
          if (
            player.x < block.x + 32 &&
            player.x + PLAYER_SIZE > block.x &&
            player.y + PLAYER_SIZE > block.y &&
            player.y + PLAYER_SIZE < block.y + 16 &&  // Solo parte inferior
            player.vy < 0  // Movimiento hacia arriba
          ) {
            // ¡Golpeado!
            block.hit = true
            block.active = false
            block.animationFrame = 1
            block.animationTimer = 300

            if (block.type === 'sword') {
              game.swordItem = {
                x: block.x + 4,
                y: block.y - 40,
                type: 'sword',
                floatOffset: 0,
                floatTimer: 0,
                collected: false,
              }
            } else if (block.type === 'bow') {
              game.bowItem = {
                x: block.x + 4,
                y: block.y - 40,
                type: 'bow',
                floatOffset: 0,
                floatTimer: 0,
                collected: false,
              }
            }
          }
        }
      })

      // Caída al vacío
      if (player.y > CANVAS_HEIGHT) {
        applyPlayerDamage()
      }

      // Colisión con monedas
      coins.forEach(coin => {
        if (!coin.collected &&
          player.x < coin.x + 24 &&
          player.x + PLAYER_SIZE > coin.x &&
          player.y < coin.y + 24 &&
          player.y + PLAYER_SIZE > coin.y
        ) {
          coin.collected = true
          setScore(prev => prev + 100)
        }
      })

      // Verificar victoria (todas las monedas recolectadas)
      if (coins.every(c => c.collected)) {
        // Verificar si hay siguiente nivel
        if (hasNextLevel(game.level)) {
          // Pasar al siguiente nivel
          const nextLevelData = getNextLevel(game.level)
          const nextLevelId = game.level + 1
          initLevel(nextLevelId)
          // Mostrar mensaje de nivel completado
          setGameState('level-complete')
        } else {
          // Juego completado
          setGameState('win')
        }
      }

      // Actualizar enemigos
      enemies.forEach(enemy => {
        // Si el enemigo ya está muerto, ignorar
        if (enemy.dead) return

        enemy.x += enemy.vx
        if (enemy.x <= enemy.startX || enemy.x >= enemy.endX) {
          enemy.vx *= -1
        }

        // Enemigos: transporte sobre plataformas móviles (sin daño por aplastamiento)
        resolveEnemyPlatformTransport([enemy], mobilePlatforms, 32)

        // Verificar colisión con ataque de espada
        if (player.isAttacking && player.attackDirection && !enemy.hitBySword) {
          const hitbox = getAttackHitbox(player, player.attackDirection)
          if (
            hitbox.x < enemy.x + 28 &&
            hitbox.x + hitbox.width > enemy.x + 4 &&
            hitbox.y < enemy.y + 28 &&
            hitbox.y + hitbox.height > enemy.y + 4
          ) {
            // Enemigo eliminado por espada
            enemy.dead = true
            enemy.hitBySword = true
            setScore(prev => prev + ATTACK_POINTS)
          }
        }

        // Colisión de espada con el Boss
        if (player.isAttacking && game.boss.active && !game.boss.dead) {
          const hitbox = getAttackHitbox(player, player.attackDirection)
          if (
            hitbox.x < game.boss.x + BOSS_SIZE &&
            hitbox.x + hitbox.width > game.boss.x &&
            hitbox.y < game.boss.y + BOSS_SIZE &&
            hitbox.y + hitbox.height > game.boss.y
          ) {
            if (game.boss.hitFlash <= 0) {
              game.boss.hp -= 1
              game.boss.hitFlash = 150
              triggerShake(8, 200)
              if (game.boss.hp <= 0) {
                game.boss.dead = true
                setScore(prev => prev + BOSS_POINTS)
              }
            }
          }
        }

        // Colisión con jugador (solo si no está en dash ni atacando)
        if (
          !player.isDashing && !player.isAttacking && player.damageInvuln <= 0 &&
          !enemy.dead &&
          player.x < enemy.x + 28 &&
          player.x + PLAYER_SIZE > enemy.x + 4 &&
          player.y < enemy.y + 28 &&
          player.y + PLAYER_SIZE > enemy.y + 4
        ) {
          // Si el jugador cae sobre el enemigo
          if (player.vy > 0 && player.y + PLAYER_SIZE < enemy.y + 16) {
            enemy.dead = true
            player.vy = JUMP_FORCE / 2
            setScore(prev => prev + 200)
          } else {
            applyPlayerDamage()
          }
        }
      })

      // Limpiar enemigos muertos
      game.enemies = enemies.filter(e => !e.dead)

      // Actualizar Boss
      updateBossInternal(game, deltaTime)

      // Colisión de proyectiles del Boss con el jugador
      if (game.boss.active && !game.boss.dead) {
        game.boss.projectiles.forEach(proj => {
          if (
            !player.isDashing && player.damageInvuln <= 0 &&
            proj.x < player.x + PLAYER_SIZE &&
            proj.x + 12 > player.x &&
            proj.y < player.y + PLAYER_SIZE &&
            proj.y + 12 > player.y
          ) {
            proj.life = 0
            applyPlayerDamage()
          }
        })
        game.boss.projectiles = game.boss.projectiles.filter(p => p.life > 0)
      }

      // Actualizar flechas (proyectiles)
      game.arrows.forEach(arrow => {
        if (!arrow.stuck && !arrow.hitEnemy) {
          arrow.x += arrow.vx
          arrow.y += arrow.vy

          if (arrow.vy !== 0) {
            arrow.vy += 0.3
          }

          const distanceTraveled = Math.abs(arrow.x - arrow.startX)
          if (distanceTraveled > ARROW_MAX_DISTANCE) {
            arrow.stuck = true
          }

          platforms.forEach(platform => {
            if (
              arrow.x < platform.x + platform.width &&
              arrow.x + 24 > platform.x &&
              arrow.y < platform.y + platform.height &&
              arrow.y + 8 > platform.y
            ) {
              arrow.stuck = true
              if (arrow.vy > 0) {
                arrow.y = platform.y - 4
              } else if (arrow.vy < 0) {
                arrow.y = platform.y + platform.height
              }
              arrow.vx = 0
              arrow.vy = 0
            }
          })

          enemies.forEach(enemy => {
            if (!enemy.dead && !arrow.hitEnemy) {
              if (
                arrow.x < enemy.x + 28 &&
                arrow.x + 24 > enemy.x + 4 &&
                arrow.y < enemy.y + 28 &&
                arrow.y + 8 > enemy.y + 4
              ) {
                enemy.dead = true
                arrow.hitEnemy = true
                arrow.stuck = true
                setScore(prev => prev + ARROW_POINTS)

                // Colisión con Boss (flechas)
                if (game.boss.active && !game.boss.dead) {
                  if (
                    arrow.x < game.boss.x + BOSS_SIZE &&
                    arrow.x + 24 > game.boss.x &&
                    arrow.y < game.boss.y + BOSS_SIZE &&
                    arrow.y + 8 > game.boss.y
                  ) {
                    game.boss.hp -= 1
                    game.boss.hitFlash = 150
                    arrow.hitEnemy = true
                    arrow.stuck = true
                    triggerShake(5, 150)
                    if (game.boss.hp <= 0) {
                      game.boss.dead = true
                      setScore(prev => prev + BOSS_POINTS)
                    }
                  }
                }

                // Crear efecto de impacto
                for (let i = 0; i < 8; i++) {
                  const angle = (Math.PI * 2 * i) / 8
                  game.arrowImpacts.push({
                    x: enemy.x + 16,
                    y: enemy.y + 16,
                    vx: Math.cos(angle) * 3,
                    vy: Math.sin(angle) * 3,
                    life: 300,
                    maxLife: 300,
                    color: i % 2 === 0 ? '#FFD700' : '#FF6B6B',
                    size: 4,
                  })
                }
              }
            }
          })
        } else if (arrow.stuck) {
          arrow.stuckTimer += deltaTime
          arrow.stuckAlpha = Math.max(0, 1 - (arrow.stuckTimer / ARROW_STUCK_TIME))
        }
      })

      game.arrows = game.arrows.filter(arrow => {
        if (arrow.hitEnemy) {
          return false
        }
        if (arrow.stuck && arrow.stuckTimer >= ARROW_STUCK_TIME) {
          return false
        }
        if (!arrow.stuck && (arrow.y > CANVAS_HEIGHT || arrow.x < camera.x - 100 || arrow.x > camera.x + CANVAS_WIDTH + 100)) {
          return false
        }
        return true
      })

      game.arrowImpacts.forEach(impact => {
        impact.x += impact.vx
        impact.y += impact.vy
        impact.vy += 0.2 // Gravedad de la partícula
        impact.life -= deltaTime
      })
      game.arrowImpacts = game.arrowImpacts.filter(i => i.life > 0)

      // Actualizar partículas globales
      game.particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.life -= deltaTime
      })
      game.particles = game.particles.filter(p => p.life > 0)

      // Actualizar cámara
      camera.x = Math.max(0, Math.min(player.x - CANVAS_WIDTH / 2, levelWidth - CANVAS_WIDTH))

      // Dibujar cielo (color según nivel) - USANDO REF PARA EVITAR CLOSURE BUGS
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

      // Dibujar plataformas
      platforms.forEach(platform => {
        if (platform.type === 'ground') {
          ctx.fillStyle = COLORS.grass
          ctx.fillRect(platform.x, platform.y, platform.width, 10)
          ctx.fillStyle = COLORS.ground
          ctx.fillRect(platform.x, platform.y + 10, platform.width, platform.height - 10)
        } else if (platform.type === 'block') {
          ctx.fillStyle = '#8B4513'
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
          // Detalle de ladrillos
          ctx.fillStyle = '#A0522D'
          for (let i = 0; i < platform.width; i += 20) {
            ctx.fillRect(platform.x + i, platform.y, 18, platform.height - 2)
          }
        } else {
          ctx.fillStyle = '#8B4513'
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height)
          ctx.fillStyle = '#228B22'
          ctx.fillRect(platform.x, platform.y, platform.width, 5)
        }
      })

      // Dibujar plataformas móviles
      mobilePlatforms.forEach(platform => {
        drawMobilePlatform(ctx, platform)
      })

      // Dibujar monedas
      coins.forEach(coin => drawCoin(ctx, coin, timestamp))

      // Dibujar enemigos
      enemies.forEach(enemy => drawEnemy(ctx, enemy, timestamp, timestamp))

      // Dibujar Boss
      drawBoss(ctx, game.boss, timestamp)

      // La barra de vida del Boss ahora se maneja vía HTML/React HUD

      // Dibujar bloques ?
      powerUpBlocks.forEach(block => {
        drawPowerUpBlock(ctx, block, timestamp)
      })

      // Dibujar item espada flotando
      if (game.swordItem && !game.swordItem.collected) {
        drawSwordItem(ctx, game.swordItem, timestamp)
      }

      // Dibujar item arco flotando
      if (game.bowItem && !game.bowItem.collected) {
        drawBowItem(ctx, game.bowItem, timestamp)
      }

      // Dibujar flechas
      game.arrows.forEach(arrow => {
        drawArrow(ctx, arrow)
      })

      // Dibujar efectos de impacto
      game.arrowImpacts.forEach(impact => {
        ctx.save()
        ctx.globalAlpha = impact.life / impact.maxLife
        ctx.fillStyle = impact.color
        ctx.fillRect(impact.x, impact.y, impact.size, impact.size)
        ctx.restore()
      })

      // Dibujar partículas globales
      game.particles.forEach(p => {
        ctx.save()
        ctx.globalAlpha = p.life / p.maxLife
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
        ctx.restore()
      })

      // Dibujar jugador
      drawPlayer(ctx, player, game.dashState, timestamp)

      // Dibujar efecto de ataque de espada
      if (player.isAttacking && player.attackDirection) {
        drawSwordAttack(ctx, player, player.attackDirection, player.attackTimer)
      }

      ctx.restore()

      animationId = requestAnimationFrame(update)
    }

    animationId = requestAnimationFrame(update)

    return () => cancelAnimationFrame(animationId)
  }, [gameState])

  // Control de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      gameRef.current.keys[e.key] = true
    }
    const handleKeyUp = (e) => {
      gameRef.current.keys[e.key] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const startGame = () => {
    initLevel(1)
    setScore(0)
    setLives(3)
    setLevel(1)
    setSwordTimeLeft(0)
    setSwordActive(false)
    setPlayerRefHasBow(false)
    setArrowCount(0)
    setGameState('playing')
  }

  const nextLevel = () => {
    initLevel(level)
    setGameState('playing')
  }

  return (
    <div className="game-container">
      <h1 className="title">🎮 8-BIT ADVENTURE</h1>

      <div className="hud">
        <div className="hud-item">SCORE: {score.toString().padStart(6, '0')}</div>
        <div className="hud-item">LIVES: {'❤️'.repeat(lives)}</div>
        <div className="hud-item">DASH: {'⚡'.repeat(dashCharges)}</div>
        <div className="hud-item">LEVEL: {level} - {levelName}</div>
      </div>

      {/* Barra de espada (solo cuando está activa) */}
      {playerRefHasSword && (
        <div className="sword-bar-container">
          <div className="sword-bar">
            <span className="sword-icon">⚔️</span>
            <div className="sword-time-bar">
              <div
                className={`sword-time-fill ${swordTimeLeft <= 3 ? 'warning' : ''} ${swordTimeLeft <= 1 ? 'critical' : ''}`}
                style={{ width: `${(swordTimeLeft / 10) * 100}%` }}
              />
            </div>
            <span className="sword-time-text">{swordTimeLeft.toFixed(1)}s</span>
          </div>
        </div>
      )}

      {/* Barra de arco (solo cuando tiene arco y flechas) */}
      {playerRefHasBow && arrowCount > 0 && (
        <div className="bow-bar-container">
          <div className="bow-bar">
            <span className="bow-icon">🏹</span>
            <span className="bow-label">ARROWS:</span>
            <div className="bow-arrows">
              <span className="bow-arrows-icon">➡️</span>
              <span className="bow-arrows-count">{arrowCount}/{MAX_ARROWS}</span>
            </div>
          </div>
        </div>
      )}

      {/* Boss HUD */}
      {gameRef.current.boss.active && !gameRef.current.boss.dead && (
        <div className="boss-hud">
          <div className="boss-name">Dark Castle Guardian</div>
          <div className="boss-hp-container">
            <div 
              className="boss-hp-fill" 
              style={{ width: `${(gameRef.current.boss.hp / BOSS_MAX_HP) * 100}%` }}
            />
            <div className="boss-hp-text">{gameRef.current.boss.hp} / {BOSS_MAX_HP} HP</div>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
      />

      <div className="controls-info">
        <p>⬅️ ➡️ or A/D - Move | ⬆️ or W or SPACE - Jump | SHIFT - Dash | Z - Attack (sword) | C - Shoot (bow)</p>
        <p className="sword-hint">💡 Tip: Hit ? blocks from below to get sword or bow!</p>
        {playerRefHasBow && <p className="bow-hint">🏹 Use C to shoot arrows! Combine with ⬆️ for diagonal shots.</p>}
      </div>

      {gameState === 'start' && (
        <div className="overlay">
          <div className="menu-box">
            <h2 className="menu-title">8-BIT ADVENTURE</h2>
            <p className="menu-subtitle">Collect all coins!</p>
            <button className="start-btn" onClick={startGame}>
              START GAME
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="overlay">
          <div className="menu-box">
            <h2 className="menu-title gameover">GAME OVER</h2>
            <p className="menu-score">Final Score: {score}</p>
            <button className="start-btn" onClick={startGame}>
              TRY AGAIN
            </button>
          </div>
        </div>
      )}

      {gameState === 'win' && (
        <div className="overlay">
          <div className="menu-box">
            <h2 className="menu-title winner">🎉 YOU WIN! 🎉</h2>
            <p className="menu-score">Final Score: {score}</p>
            <button className="start-btn" onClick={startGame}>
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {gameState === 'level-complete' && (
        <div className="overlay">
          <div className="menu-box">
            <h2 className="menu-title winner">LEVEL {level - 1} COMPLETE!</h2>
            <p className="menu-subtitle">Get ready for Level {level}</p>
            <p className="menu-score">Score: {score}</p>
            <button className="start-btn" onClick={nextLevel}>
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
