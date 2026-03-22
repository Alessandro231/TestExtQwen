import { useState, useEffect, useCallback, useRef } from "react";
import { loadLevel } from "./levelUtils";
import { createMobilePlatforms } from "./mobilePlatforms";
import { createCheckpoints, getCheckpointStatus } from "./checkpoints";
import { useAnimationFrameLoop } from "./useAnimationFrameLoop";
import { renderGameScene, getPlayerAttackHitbox } from "./game/rendering";
import { updateBossSystem } from "./game/bossSystem";
import { stepGameFrame } from "./game/gameStep";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const PLAYER_SIZE = 32;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const DASH_SPEED = 18;
const DASH_DURATION = 150;
const MAX_DASH_CHARGES = 3;
const DASH_RECHARGE_TIME = 2000;
const DAMAGE_INVULN_TIME = 1000;
const COYOTE_TIME_MS = 120;
const JUMP_BUFFER_MS = 140;
const DEBUG_HUD_UPDATE_MS = 120;

// Constantes del sistema de espada
const SWORD_DURATION = 10000; // 10 segundos total
const SWORD_WARNING_TIME = 3000; // 3 segundos: advertencia amarilla
const SWORD_CRITICAL_TIME = 1000; // 1 segundo: advertencia roja, sin ataque
const ATTACK_DURATION = 200; // ms que el hitbox está activo
const ATTACK_COOLDOWN = 300; // ms entre ataques
const ATTACK_POINTS = 200; // Puntos por enemigo

// Constantes del sistema de arco
const MAX_ARROWS = 20; // Capacidad máxima de flechas
const START_ARROWS = 10; // Flechas al recoger el arco
const ARROW_SPEED = 12; // Velocidad del proyectil (px/frame)
const ARROW_MAX_DISTANCE = 400; // Alcance máximo horizontal
const ARROW_STUCK_TIME = 3000; // Tiempo clavada en plataforma (ms)
const SHOOT_COOLDOWN = 250; // ms entre disparos
const ARROW_POINTS = 150; // Puntos por enemigo eliminado con flecha
const BOW_CHARGE_MAX_MS = 1200; // Carga máxima del arco (ms)
const BOW_MIN_POWER_SCALE = 0.35; // Potencia mínima al click corto
const BOW_MAX_RANGE_SCALE = 1.35; // Alcance máximo con carga completa

// Constantes del Boss
const BOSS_MAX_HP = 5; // Vida total del Jefe
const BOSS_ATTACK_COOLDOWN = 1800; // ms entre disparos del Jefe
const BOSS_SIZE = 64; // Doble de un enemigo normal
const BOSS_POINTS = 5000; // Recompensa final

function App() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("start");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [dashCharges, setDashCharges] = useState(MAX_DASH_CHARGES);
  const [level, setLevel] = useState(1);
  const [levelName, setLevelName] = useState("");
  const [bossHud, setBossHud] = useState({ active: false, dead: true, hp: 0 });
  const [debugHud, setDebugHud] = useState({
    enabled: false,
    fps: 0,
    playerX: 0,
    playerY: 0,
    playerVx: 0,
    playerVy: 0,
    onGround: false,
    coyoteMs: 0,
    jumpBufferMs: 0,
    enemies: 0,
    arrows: 0,
  });
  const [checkpointHud, setCheckpointHud] = useState({
    activeLabel: "START",
    activeIndex: 0,
    total: 0,
  });
  const [checkpointNotice, setCheckpointNotice] = useState("");
  const bossHudRef = useRef({ active: false, dead: true, hp: 0 });
  const checkpointNoticeTimeoutRef = useRef(null);

  const gameRef = useRef({
    player: {
      x: 50,
      y: 300,
      vx: 0,
      vy: 0,
      onGround: false,
      facingRight: true,
      isDashing: false,
      dashTimer: 0,
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
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      bowAimAngle: 0,
      bowChargeMs: 0,
    },
    dashState: {
      charges: MAX_DASH_CHARGES,
      rechargeTimer: 0,
      hasDashed: false,
      trail: [],
    },
    keys: {},
    platforms: [],
    mobilePlatforms: [],
    checkpoints: [],
    coins: [],
    enemies: [],
    powerUpBlocks: [],
    portal: null,
    swordItem: null,
    bowItem: null,
    arrows: [],
    arrowImpacts: [],
    particles: [], // Sistema de partículas global
    camera: { x: 0, shake: { intensity: 0, duration: 0 } },
    levelWidth: 2000,
    level: 1, // Atajo para evitar closure bugs
    spawnPoint: { x: 50, y: 300 },
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
      justDied: false,
    },
    debug: {
      enabled: false,
      nextSnapshotAt: 0,
      fps: 0,
    },
    mouse: {
      worldX: 0,
      worldY: 0,
      screenX: 0,
      screenY: 0,
      isDown: false,
    },
    inventory: {
      hasBow: false,
      arrows: 0,
    },
  });
  const frameUpdateRef = useRef(null);

  // Estados React para UI de espada
  const [swordTimeLeft, setSwordTimeLeft] = useState(0);
  const [swordActive, setSwordActive] = useState(false);
  const [playerRefHasSword, setPlayerRefHasSword] = useState(false);

  // Estados React para UI de arco (solo contador de flechas)
  const [playerRefHasBow, setPlayerRefHasBow] = useState(false);
  const [arrowCount, setArrowCount] = useState(0);
  const [bowChargeRatio, setBowChargeRatio] = useState(0);
  const [bowCharging, setBowCharging] = useState(false);
  const syncBossHud = useCallback((boss) => {
    const nextHud = {
      active: boss.active,
      dead: boss.dead,
      hp: Math.max(0, boss.hp),
    };
    const prevHud = bossHudRef.current;
    if (
      prevHud.active !== nextHud.active ||
      prevHud.dead !== nextHud.dead ||
      prevHud.hp !== nextHud.hp
    ) {
      bossHudRef.current = nextHud;
      setBossHud(nextHud);
    }
  }, []);

  // Inicializar nivel desde archivo externo
  const initLevel = useCallback(
    (lvlId) => {
      const levelData = loadLevel(lvlId);
      const game = gameRef.current;
      game.level = lvlId; // Sincronizar ref con el ID de nivel
      setLevel(lvlId); // Actualizar estado para UI
      setLives(3);

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
        coyoteTimer: 0,
        jumpBufferTimer: 0,
        bowAimAngle: 0,
        bowChargeMs: 0,
      };
      game.dashState = {
        charges: MAX_DASH_CHARGES,
        rechargeTimer: 0,
        hasDashed: false,
        trail: [],
      };
      setDashCharges(MAX_DASH_CHARGES);
      game.camera = { x: 0, shake: { intensity: 0, duration: 0 } };
      game.levelWidth = levelData.levelWidth;
      game.spawnPoint = { ...levelData.spawnPoint };

      // Cargar plataformas
      game.platforms = levelData.platforms;
      game.mobilePlatforms = createMobilePlatforms(levelData.mobilePlatforms);
      game.checkpoints = createCheckpoints(levelData.checkpoints);
      setCheckpointHud(getCheckpointStatus(game.checkpoints));
      setCheckpointNotice("");
      if (checkpointNoticeTimeoutRef.current) {
        clearTimeout(checkpointNoticeTimeoutRef.current);
        checkpointNoticeTimeoutRef.current = null;
      }

      // Cargar monedas (con estado collected)
      game.coins = levelData.coins.map((coin) => ({
        ...coin,
        collected: false,
      }));

      // Cargar enemigos
      game.enemies = levelData.enemies.map((enemy) => ({
        ...enemy,
        dead: false,
        hitBySword: false,
      }));

      // Cargar bloques ? (power-ups)
      game.powerUpBlocks = levelData.powerUpBlocks
        ? levelData.powerUpBlocks.map((block) => ({
            ...block,
            hit: false,
            animationFrame: 0,
            animationTimer: 0,
          }))
        : [];

      // Item espada (null si no hay ninguno activo)
      game.swordItem = null;
      game.bowItem = null;
      game.arrows = [];
      game.arrowImpacts = [];

      // Limpiar impactos al daño
      game.arrowImpacts = [];

      // Resetear estados de espada en el jugador
      game.player.hasSword = false;
      game.player.swordTimer = 0;
      game.player.swordActive = false;

      // Restaurar estados de arco en el jugador (persistencia entre niveles)
      game.player.hasBow = game.inventory.hasBow;
      game.player.arrows = game.inventory.arrows;

      setSwordTimeLeft(0);
      setSwordActive(false);
      setPlayerRefHasSword(false);
      setPlayerRefHasBow(game.player.hasBow);
      setArrowCount(game.player.arrows);
      setBowChargeRatio(0);
      setBowCharging(false);
      game.portal = levelData.portal
        ? { ...levelData.portal, active: !levelData.portal.requiresBossDefeat }
        : null;

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
          justDied: false,
        };
        syncBossHud(game.boss);
      } else {
        game.boss = {
          active: false,
          hp: 0,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          onGround: false,
          attackCooldown: 0,
          projectiles: [],
          dead: true,
          hitFlash: 0,
          justDied: false,
        };
        syncBossHud(game.boss);
      }

      setLevelName(levelData.name);
    },
    [setLives, syncBossHud],
  );

  const updateBossInternal = useCallback(
    (game, deltaTime) => {
      updateBossSystem({
        game,
        deltaTime,
        getAttackHitbox: getPlayerAttackHitbox,
        syncBossHud,
        addScore: (points) => setScore((prev) => prev + points),
      });
    },
    [setScore, syncBossHud],
  );

  // Función para crear partículas (vfx)
  const spawnParticles = (x, y, count, color, speedScale = 1) => {
    const game = gameRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 2) * speedScale;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500 + Math.random() * 500,
        maxLife: 1000,
        size: Math.random() * 4 + 2,
        color: color,
      });
    }
  };

  // Función para activar el Screen Shake
  const triggerShake = (intensity, duration) => {
    const game = gameRef.current;
    game.camera.shake.intensity = intensity;
    game.camera.shake.duration = duration;
  };

  // Loop del juego
  useEffect(() => {
    if (gameState !== "playing") {
      frameUpdateRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const game = gameRef.current;
    const update = (timestamp, deltaTime) => {
      stepGameFrame({
        game,
        timestamp,
        deltaTime,
        config: {
          CANVAS_HEIGHT,
          CANVAS_WIDTH,
          PLAYER_SIZE,
          DAMAGE_INVULN_TIME,
          COYOTE_TIME_MS,
          SWORD_CRITICAL_TIME,
          SWORD_DURATION,
          START_ARROWS,
          ARROW_SPEED,
          SHOOT_COOLDOWN,
          ATTACK_COOLDOWN,
          ATTACK_DURATION,
          MOVE_SPEED,
          DASH_SPEED,
          DASH_DURATION,
          MAX_DASH_CHARGES,
          DASH_RECHARGE_TIME,
          GRAVITY,
          JUMP_FORCE,
          ARROW_MAX_DISTANCE,
          ARROW_STUCK_TIME,
          ARROW_POINTS,
          BOW_CHARGE_MAX_MS,
          BOW_MIN_POWER_SCALE,
          BOW_MAX_RANGE_SCALE,
          ATTACK_POINTS,
          BOSS_SIZE,
          BOSS_POINTS,
          DEBUG_HUD_UPDATE_MS,
        },
        initLevel,
        syncBossHud,
        updateBossInternal,
        checkpointNoticeTimeoutRef,
        setLives,
        setGameState,
        setDashCharges,
        setSwordTimeLeft,
        setSwordActive,
        setPlayerRefHasSword,
        setPlayerRefHasBow,
        setArrowCount,
        setBowChargeRatio,
        setBowCharging,
        setScore,
        setCheckpointHud,
        setCheckpointNotice,
        setDebugHud,
        getPlayerAttackHitbox,
        spawnParticles,
        triggerShake,
      });

      renderGameScene(ctx, game, timestamp);
    };

    frameUpdateRef.current = update;

    return () => {
      frameUpdateRef.current = null;
    };
  }, [gameState, initLevel, syncBossHud, updateBossInternal]);

  useAnimationFrameLoop(gameState === "playing", (timestamp, deltaTime) => {
    if (!frameUpdateRef.current) return;
    frameUpdateRef.current(timestamp, deltaTime);
  });

  useEffect(() => {
    return () => {
      if (checkpointNoticeTimeoutRef.current) {
        clearTimeout(checkpointNoticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const getCanvasPoint = (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    };

    const handleMouseMove = (event) => {
      const point = getCanvasPoint(event);
      if (!point) return;
      const game = gameRef.current;
      game.mouse.screenX = point.x;
      game.mouse.screenY = point.y;
      game.mouse.worldX = point.x + game.camera.x;
      game.mouse.worldY = point.y;
    };

    const handleMouseDown = (event) => {
      if (event.button !== 0) return;
      gameRef.current.mouse.isDown = true;
    };

    const handleMouseUp = (event) => {
      if (event.button !== 0) return;
      gameRef.current.mouse.isDown = false;
    };

    const handleWindowBlur = () => {
      gameRef.current.mouse.isDown = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  // Control de teclado
  useEffect(() => {
    const isJumpKey = (key) =>
      key === "ArrowUp" || key === "w" || key === "W" || key === " ";

    const handleKeyDown = (e) => {
      const game = gameRef.current;
      game.keys[e.key] = true;

      if (isJumpKey(e.key)) {
        game.player.jumpBufferTimer = JUMP_BUFFER_MS;
      }

      if (e.key === "F3") {
        e.preventDefault();
        game.debug.enabled = !game.debug.enabled;
        game.debug.nextSnapshotAt = 0;
        setDebugHud((prev) => ({ ...prev, enabled: game.debug.enabled }));
      }
    };
    const handleKeyUp = (e) => {
      gameRef.current.keys[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const startGame = () => {
    gameRef.current.inventory = { hasBow: false, arrows: 0 };
    gameRef.current.mouse.isDown = false;
    initLevel(1);
    setScore(0);
    setLives(3);
    setLevel(1);
    setSwordTimeLeft(0);
    setSwordActive(false);
    setPlayerRefHasSword(false);
    setPlayerRefHasBow(false);
    setArrowCount(0);
    setBowChargeRatio(0);
    setBowCharging(false);
    setGameState("playing");
  };

  const nextLevel = () => {
    initLevel(level);
    setGameState("playing");
  };

  return (
    <div className="game-container">
      <h1 className="title">🎮 8-BIT ADVENTURE</h1>

      <div className="hud">
        <div className="hud-item">
          SCORE: {score.toString().padStart(6, "0")}
        </div>
        <div className="hud-item">LIVES: {"❤️".repeat(lives)}</div>
        <div className="hud-item">DASH: {"⚡".repeat(dashCharges)}</div>
        <div className="hud-item">
          LEVEL: {level} - {levelName}
        </div>
      </div>

      <div className="checkpoint-status">
        <span>CHECKPOINT: {checkpointHud.activeLabel}</span>
        <span>
          {checkpointHud.total > 0
            ? `${checkpointHud.activeIndex}/${checkpointHud.total}`
            : "0/0"}
        </span>
      </div>

      {bossHud.active && (
        <div
          className={`boss-status-strip ${bossHud.dead ? "defeated" : "alive"}`}
        >
          <span>BOSS:</span>
          <span>
            {bossHud.dead ? "DEFEATED" : `${bossHud.hp}/${BOSS_MAX_HP} HP`}
          </span>
        </div>
      )}

      {checkpointNotice && (
        <div className="checkpoint-notice">{checkpointNotice}</div>
      )}

      {/* Barra de espada (solo cuando está activa) */}
      {playerRefHasSword && (
        <div className="sword-bar-container">
          <div className="sword-bar">
            <span className="sword-icon">⚔️</span>
            <div className="sword-time-bar">
              <div
                className={`sword-time-fill ${swordTimeLeft <= SWORD_WARNING_TIME / 1000 ? "warning" : ""} ${swordTimeLeft <= SWORD_CRITICAL_TIME / 1000 ? "critical" : ""}`}
                style={{
                  width: `${(swordTimeLeft / (SWORD_DURATION / 1000)) * 100}%`,
                }}
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
            <div className="bow-time-bar">
              <div
                className="bow-time-fill"
                style={{
                  width: `${bowChargeRatio * 100}%`,
                  opacity: bowCharging ? 1 : 0.45,
                }}
              />
            </div>
            <div className="bow-arrows">
              <span className="bow-arrows-icon">➡️</span>
              <span className="bow-arrows-count">
                {arrowCount}/{MAX_ARROWS}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Boss HUD */}
      {bossHud.active && !bossHud.dead && (
        <div className="boss-hud">
          <div className="boss-name">Dark Castle Guardian</div>
          <div className="boss-hp-container">
            <div
              className="boss-hp-fill"
              style={{ width: `${(bossHud.hp / BOSS_MAX_HP) * 100}%` }}
            />
            <div className="boss-hp-text">
              {bossHud.hp} / {BOSS_MAX_HP} HP
            </div>
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
        <p>
          ⬅️ ➡️ or A/D - Move | ⬆️ or W or SPACE - Jump | SHIFT - Dash | Z -
          Attack (sword) | Mouse Left Click (hold/release) - Shoot (bow) | F3 -
          Debug
        </p>
        <p className="sword-hint">
          Touch a checkpoint flag to set your respawn position in the current
          level.
        </p>
        <p className="sword-hint">
          💡 Tip: Hit ? blocks from below to get sword or bow!
        </p>
        {playerRefHasBow && (
          <p className="bow-hint">
            🏹 Mantén click izquierdo para cargar y suelta para disparar al
            cursor.
          </p>
        )}
      </div>

      {debugHud.enabled && (
        <div className="debug-hud">
          <div>FPS: {debugHud.fps}</div>
          <div>
            POS: {debugHud.playerX}, {debugHud.playerY}
          </div>
          <div>
            VEL: {debugHud.playerVx}, {debugHud.playerVy}
          </div>
          <div>GROUND: {debugHud.onGround ? "YES" : "NO"}</div>
          <div>COYOTE: {debugHud.coyoteMs}ms</div>
          <div>BUFFER: {debugHud.jumpBufferMs}ms</div>
          <div>ENEMIES: {debugHud.enemies}</div>
          <div>ARROWS: {debugHud.arrows}</div>
        </div>
      )}

      {gameState === "start" && (
        <div className="overlay">
          <div className="menu-box">
            <h2 className="menu-title">8-BIT ADVENTURE</h2>
            <p className="menu-subtitle">
              Find the portal to advance—coins boost your score!
            </p>
            <button className="start-btn" onClick={startGame}>
              START GAME
            </button>
          </div>
        </div>
      )}

      {gameState === "gameover" && (
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

      {gameState === "win" && (
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

      {gameState === "level-complete" && (
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
  );
}

export default App;
