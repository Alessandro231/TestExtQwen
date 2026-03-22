import { hasNextLevel, getNextLevel } from "../levelUtils";
import {
  activateCheckpointIfTouched,
  getCheckpointStatus,
  getRespawnPoint,
} from "../checkpoints";
import {
  updateMobilePlatforms,
  resolvePlayerOnMobilePlatforms,
  isPlayerCrushedByMobilePlatform,
  resolveEnemyPlatformTransport,
} from "../mobilePlatforms";
import { updateJumpAssistTimers, tryConsumeBufferedJump } from "./physics";

export function stepGameFrame({
  game,
  timestamp,
  deltaTime,
  config,
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
}) {
  const {
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
    DEBUG_HUD_UPDATE_MS,
  } = config;

  const {
    player,
    keys,
    platforms,
    mobilePlatforms,
    checkpoints,
    coins,
    enemies,
    camera,
    levelWidth,
    powerUpBlocks,
    spawnPoint,
    boss,
    portal,
  } = game;

  const completeLevel = () => {
    game.inventory.hasBow = player.hasBow;
    game.inventory.arrows = Math.max(0, Math.min(MAX_ARROWS, player.arrows));

    if (hasNextLevel(game.level)) {
      const nextLevelData = getNextLevel(game.level);
      if (nextLevelData) {
        initLevel(nextLevelData.id);
      }
      setGameState("level-complete");
    } else {
      setGameState("win");
    }
  };

  const applyPlayerDamage = () => {
    if (player.damageInvuln > 0) return;

    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameState("gameover");
      } else {
        const respawn = getRespawnPoint(spawnPoint, checkpoints);
        player.x = Math.max(0, Math.min(levelWidth - PLAYER_SIZE, respawn.x));
        player.y = respawn.y;
        player.vx = 0;
        player.vy = 0;
        player.onGround = false;
        player.supportVelocityX = 0;
        player.supportedByMobileId = null;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.damageInvuln = DAMAGE_INVULN_TIME;
        game.dashState.charges = MAX_DASH_CHARGES;
        game.dashState.trail = [];
        setDashCharges(MAX_DASH_CHARGES);
        player.isDashing = false;

        player.hasSword = false;
        player.swordTimer = 0;
        player.swordActive = false;
        setSwordTimeLeft(0);
        setSwordActive(false);
        setPlayerRefHasSword(false);

        player.hasBow = false;
        player.arrows = 0;
        player.bowChargeMs = 0;
        player.isShooting = false;
        game.arrows = [];
        game.arrowImpacts = [];
        setPlayerRefHasBow(false);
        setArrowCount(0);
        setBowChargeRatio(0);
        setBowCharging(false);
      }
      return newLives;
    });
  };

  if (player.damageInvuln > 0) {
    player.damageInvuln = Math.max(0, player.damageInvuln - deltaTime);
  }
  updateJumpAssistTimers(player, deltaTime, COYOTE_TIME_MS);

  if (game.camera.shake.duration > 0) {
    game.camera.shake.duration -= deltaTime;
    if (game.camera.shake.duration <= 0) {
      game.camera.shake.intensity = 0;
    }
  }

  if (game.boss.active && game.boss.hitFlash > 0) {
    game.boss.hitFlash -= deltaTime;
  }

  if (portal) {
    const bossCleared = !boss?.active || boss.dead;
    portal.active = !portal.requiresBossDefeat || bossCleared;
  }

  updateMobilePlatforms(deltaTime, mobilePlatforms);

  if (player.hasSword && player.swordTimer > 0) {
    player.swordTimer -= deltaTime;
    if (player.swordTimer <= 0) {
      player.hasSword = false;
      player.swordActive = false;
      setSwordTimeLeft(0);
      setSwordActive(false);
      setPlayerRefHasSword(false);
    } else {
      const timeLeft = player.swordTimer / 1000;
      setSwordTimeLeft(timeLeft);
      player.swordActive = player.swordTimer >= SWORD_CRITICAL_TIME;
      setSwordActive(player.swordActive);
      setPlayerRefHasSword(true);
    }
  } else if (player.hasSword) {
    setPlayerRefHasSword(true);
  }

  if (player.hasBow) {
    setPlayerRefHasBow(true);
    setArrowCount(player.arrows);
    if (player.arrows <= 0) {
      player.hasBow = false;
      player.bowActive = false;
      player.bowChargeMs = 0;
      player.isShooting = false;
      setPlayerRefHasBow(false);
      setArrowCount(0);
      setBowChargeRatio(0);
      setBowCharging(false);
    }
  }

  if (player.shootCooldown > 0) {
    player.shootCooldown -= deltaTime;
  }

  if (player.hasBow && player.arrows > 0) {
    const originX = player.x + PLAYER_SIZE / 2;
    const originY = player.y + PLAYER_SIZE / 2;
    const mouseX = Number.isFinite(game.mouse.worldX)
      ? game.mouse.worldX
      : originX + (player.facingRight ? 100 : -100);
    const mouseY = Number.isFinite(game.mouse.worldY)
      ? game.mouse.worldY
      : originY;
    const targetX = mouseX;
    const targetY = mouseY;
    const dx = targetX - originX;
    const dy = targetY - originY;
    const fallbackAngle = player.facingRight ? 0 : Math.PI;
    const aimAngle =
      Math.abs(dx) + Math.abs(dy) < 0.001 ? fallbackAngle : Math.atan2(dy, dx);

    player.bowAimAngle = aimAngle;
    player.facingRight = Math.cos(aimAngle) >= 0;

    if (game.mouse.isDown && player.shootCooldown <= 0) {
      player.isShooting = true;
      player.bowChargeMs = Math.min(
        BOW_CHARGE_MAX_MS,
        player.bowChargeMs + deltaTime,
      );
    } else if (player.isShooting) {
      const chargeRatio = Math.max(
        0,
        Math.min(1, player.bowChargeMs / BOW_CHARGE_MAX_MS),
      );
      const powerScale =
        BOW_MIN_POWER_SCALE + (1 - BOW_MIN_POWER_SCALE) * chargeRatio;
      const speed = ARROW_SPEED * powerScale;
      const maxDistance =
        ARROW_MAX_DISTANCE * (1 + (BOW_MAX_RANGE_SCALE - 1) * chargeRatio);

      const startX = player.x + PLAYER_SIZE / 2 + Math.cos(aimAngle) * 18;
      const startY = player.y + 12 + Math.sin(aimAngle) * 10;
      const vx = Math.cos(aimAngle) * speed;
      const vy = Math.sin(aimAngle) * speed;

      game.arrows.push({
        x: startX,
        y: startY,
        vx,
        vy,
        angle: aimAngle,
        startX,
        startY,
        maxDistance,
        stuck: false,
        stuckTimer: 0,
        stuckAlpha: 1,
        hitEnemy: false,
      });

      player.arrows -= 1;
      player.shootCooldown = SHOOT_COOLDOWN;
      setArrowCount(player.arrows);
      player.bowChargeMs = 0;
      player.isShooting = false;
    }

    const ratio = Math.max(
      0,
      Math.min(1, player.bowChargeMs / BOW_CHARGE_MAX_MS),
    );
    setBowChargeRatio(ratio);
    setBowCharging(player.isShooting);
  } else {
    player.bowChargeMs = 0;
    player.isShooting = false;
    setBowChargeRatio(0);
    setBowCharging(false);
  }

  if (player.attackCooldown > 0) {
    player.attackCooldown -= deltaTime;
  }

  if (
    player.hasSword &&
    player.swordActive &&
    (keys.z || keys.Z || keys.x || keys.X) &&
    player.attackCooldown <= 0
  ) {
    let attackDir = null;
    if (keys.ArrowRight || keys.d) {
      attackDir = "right";
      player.facingRight = true;
    } else if (keys.ArrowLeft || keys.a) {
      attackDir = "left";
      player.facingRight = false;
    } else if (keys.ArrowUp || keys.w) {
      attackDir = "up";
    } else {
      attackDir = player.facingRight ? "right" : "left";
    }

    player.isAttacking = true;
    player.attackDirection = attackDir;
    player.attackTimer = ATTACK_DURATION;
    player.attackCooldown = ATTACK_COOLDOWN;
  }

  if (player.isAttacking && player.attackTimer > 0) {
    player.attackTimer -= deltaTime;
    if (player.attackTimer <= 0) {
      player.isAttacking = false;
      player.attackDirection = null;
    }
  }

  powerUpBlocks.forEach((block) => {
    if (block.animationTimer > 0) {
      block.animationTimer -= deltaTime;
      if (block.animationTimer <= 0) {
        block.animationFrame = 0;
      }
    }
  });

  if (game.swordItem && !game.swordItem.collected) {
    const item = game.swordItem;
    item.floatTimer += deltaTime;
    item.floatOffset = Math.sin(item.floatTimer / 200) * 5;

    if (
      player.x < item.x + 24 &&
      player.x + PLAYER_SIZE > item.x &&
      player.y < item.y + 24 &&
      player.y + PLAYER_SIZE > item.y
    ) {
      item.collected = true;
      player.hasSword = true;
      player.swordTimer = SWORD_DURATION;
      player.swordActive = true;
      game.swordItem = null;
      setSwordTimeLeft(SWORD_DURATION / 1000);
      setSwordActive(true);
      setPlayerRefHasSword(true);
    }
  }

  if (game.bowItem && !game.bowItem.collected) {
    const item = game.bowItem;
    item.floatTimer += deltaTime;
    item.floatOffset = Math.sin(item.floatTimer / 200) * 5;

    if (
      player.x < item.x + 24 &&
      player.x + PLAYER_SIZE > item.x &&
      player.y < item.y + 24 &&
      player.y + PLAYER_SIZE > item.y
    ) {
      item.collected = true;
      player.hasBow = true;
      player.arrows = Math.min(MAX_ARROWS, player.arrows + START_ARROWS);
      game.bowItem = null;
      setPlayerRefHasBow(true);
      setArrowCount(player.arrows);
    }
  }

  if (player.isDashing) {
    player.dashTimer -= deltaTime;
    if (player.dashTimer <= 0) {
      player.isDashing = false;
    } else {
      player.vy = 0;
      player.vx = player.facingRight ? DASH_SPEED : -DASH_SPEED;
      game.dashState.trail.push({
        x: player.x,
        y: player.y,
        facingRight: player.facingRight,
        alpha: 0.5,
      });
    }
  } else {
    if (keys.ArrowLeft || keys.a) {
      player.vx = -MOVE_SPEED;
      player.facingRight = false;
    } else if (keys.ArrowRight || keys.d) {
      player.vx = MOVE_SPEED;
      player.facingRight = true;
    } else {
      player.vx = 0;
    }

    tryConsumeBufferedJump(player, JUMP_FORCE);
  }

  if (
    keys.Shift &&
    game.dashState.charges > 0 &&
    !player.isDashing &&
    !game.dashState.hasDashed
  ) {
    game.dashState.charges -= 1;
    setDashCharges(game.dashState.charges);
    player.isDashing = true;
    player.dashTimer = DASH_DURATION;
    game.dashState.hasDashed = true;
  }
  if (!keys.Shift) {
    game.dashState.hasDashed = false;
  }

  if (game.dashState.charges < MAX_DASH_CHARGES && !player.isDashing) {
    game.dashState.rechargeTimer += deltaTime;
    if (game.dashState.rechargeTimer >= DASH_RECHARGE_TIME) {
      game.dashState.charges += 1;
      game.dashState.rechargeTimer = 0;
      setDashCharges(game.dashState.charges);
    }
  } else if (player.isDashing) {
    game.dashState.rechargeTimer = 0;
  }

  game.dashState.trail.forEach((trail) => {
    trail.alpha -= 0.05 * (deltaTime / 16);
  });
  game.dashState.trail = game.dashState.trail.filter(
    (trail) => trail.alpha > 0,
  );

  if (!player.isDashing) {
    player.vy += GRAVITY;
  }

  player.x += player.vx;
  player.y += player.vy;

  if (player.x < 0) player.x = 0;
  if (player.x > levelWidth - PLAYER_SIZE) player.x = levelWidth - PLAYER_SIZE;

  player.onGround = false;
  platforms.forEach((platform) => {
    if (
      player.x < platform.x + platform.width &&
      player.x + PLAYER_SIZE > platform.x &&
      player.y + PLAYER_SIZE > platform.y &&
      player.y + PLAYER_SIZE < platform.y + platform.height &&
      player.vy >= 0
    ) {
      player.y = platform.y - PLAYER_SIZE;
      player.vy = 0;
      player.onGround = true;
    }
  });

  resolvePlayerOnMobilePlatforms(player, mobilePlatforms, PLAYER_SIZE);

  if (player.x < 0) player.x = 0;
  if (player.x > levelWidth - PLAYER_SIZE) player.x = levelWidth - PLAYER_SIZE;

  const activatedCheckpoint = activateCheckpointIfTouched(
    player,
    checkpoints,
    PLAYER_SIZE,
  );
  if (activatedCheckpoint) {
    const checkpointStatus = getCheckpointStatus(checkpoints);
    setCheckpointHud(checkpointStatus);
    setCheckpointNotice(
      `CHECKPOINT ${checkpointStatus.activeIndex}/${checkpointStatus.total}: ${activatedCheckpoint.label}`,
    );

    if (checkpointNoticeTimeoutRef.current) {
      clearTimeout(checkpointNoticeTimeoutRef.current);
    }
    checkpointNoticeTimeoutRef.current = setTimeout(() => {
      setCheckpointNotice("");
      checkpointNoticeTimeoutRef.current = null;
    }, 1800);

    spawnParticles(
      activatedCheckpoint.x,
      activatedCheckpoint.y - 18,
      18,
      "#00F5A0",
      1.1,
    );
    triggerShake(3, 120);
  }

  if (
    player.damageInvuln <= 0 &&
    isPlayerCrushedByMobilePlatform(
      player,
      mobilePlatforms,
      platforms,
      PLAYER_SIZE,
    )
  ) {
    applyPlayerDamage();
  }

  powerUpBlocks.forEach((block) => {
    if (!block.hit && !block.active) {
      if (
        player.x < block.x + 32 &&
        player.x + PLAYER_SIZE > block.x &&
        player.y < block.y + 32 &&
        player.y + PLAYER_SIZE > block.y
      ) {
        if (player.vy < 0 && player.y > block.y + 16) {
          player.y = block.y + 32;
          player.vy = 0;
          block.animationFrame = 1;
          block.animationTimer = 300;
        }
      }
    } else if (block.active && !block.hit) {
      if (
        player.x < block.x + 32 &&
        player.x + PLAYER_SIZE > block.x &&
        player.y + PLAYER_SIZE > block.y &&
        player.y + PLAYER_SIZE < block.y + 16 &&
        player.vy < 0
      ) {
        block.hit = true;
        block.active = false;
        block.animationFrame = 1;
        block.animationTimer = 300;

        if (block.type === "sword") {
          game.swordItem = {
            x: block.x + 4,
            y: block.y - 40,
            type: "sword",
            floatOffset: 0,
            floatTimer: 0,
            collected: false,
          };
        } else if (block.type === "bow") {
          game.bowItem = {
            x: block.x + 4,
            y: block.y - 40,
            type: "bow",
            floatOffset: 0,
            floatTimer: 0,
            collected: false,
          };
        }
      }
    }
  });

  if (player.y > CANVAS_HEIGHT) {
    applyPlayerDamage();
  }

  coins.forEach((coin) => {
    if (
      !coin.collected &&
      player.x < coin.x + 24 &&
      player.x + PLAYER_SIZE > coin.x &&
      player.y < coin.y + 24 &&
      player.y + PLAYER_SIZE > coin.y
    ) {
      coin.collected = true;
      setScore((prev) => prev + 100);
    }
  });

  const bossBlockingProgress = boss?.active && !boss.dead;

  if (portal?.active) {
    const playerTouchesPortal =
      player.x < portal.x + portal.width &&
      player.x + PLAYER_SIZE > portal.x &&
      player.y < portal.y + portal.height &&
      player.y + PLAYER_SIZE > portal.y;

    if (playerTouchesPortal) {
      completeLevel();
      return;
    }
  }

  if (coins.every((coin) => coin.collected) && !bossBlockingProgress) {
    completeLevel();
    return;
  }

  enemies.forEach((enemy) => {
    if (enemy.dead) return;

    enemy.x += enemy.vx;
    if (enemy.x <= enemy.startX || enemy.x >= enemy.endX) {
      enemy.vx *= -1;
    }

    resolveEnemyPlatformTransport([enemy], mobilePlatforms, 32);

    if (player.isAttacking && player.attackDirection && !enemy.hitBySword) {
      const hitbox = getPlayerAttackHitbox(player, player.attackDirection);
      if (
        hitbox.x < enemy.x + 28 &&
        hitbox.x + hitbox.width > enemy.x + 4 &&
        hitbox.y < enemy.y + 28 &&
        hitbox.y + hitbox.height > enemy.y + 4
      ) {
        enemy.dead = true;
        enemy.hitBySword = true;
        setScore((prev) => prev + ATTACK_POINTS);
      }
    }

    if (
      !player.isDashing &&
      !player.isAttacking &&
      player.damageInvuln <= 0 &&
      !enemy.dead &&
      player.x < enemy.x + 28 &&
      player.x + PLAYER_SIZE > enemy.x + 4 &&
      player.y < enemy.y + 28 &&
      player.y + PLAYER_SIZE > enemy.y + 4
    ) {
      if (player.vy > 0 && player.y + PLAYER_SIZE < enemy.y + 16) {
        enemy.dead = true;
        player.vy = JUMP_FORCE / 2;
        setScore((prev) => prev + 200);
      } else {
        applyPlayerDamage();
      }
    }
  });

  game.enemies = enemies.filter((enemy) => !enemy.dead);
  updateBossInternal(game, deltaTime);

  if (boss?.justDied) {
    boss.justDied = false;
    completeLevel();
    return;
  }

  if (game.boss.active && !game.boss.dead) {
    game.boss.projectiles.forEach((proj) => {
      if (
        !player.isDashing &&
        player.damageInvuln <= 0 &&
        proj.x < player.x + PLAYER_SIZE &&
        proj.x + 12 > player.x &&
        proj.y < player.y + PLAYER_SIZE &&
        proj.y + 12 > player.y
      ) {
        proj.life = 0;
        applyPlayerDamage();
      }
    });
    game.boss.projectiles = game.boss.projectiles.filter(
      (proj) => proj.life > 0,
    );
  }

  game.arrows.forEach((arrow) => {
    if (!arrow.stuck && !arrow.hitEnemy) {
      arrow.x += arrow.vx;
      arrow.y += arrow.vy;

      if (arrow.vx !== 0 || arrow.vy !== 0) {
        arrow.angle = Math.atan2(arrow.vy, arrow.vx);
      }

      if (arrow.vy !== 0) {
        arrow.vy += 0.3;
      }

      const distanceTraveled = Math.hypot(
        arrow.x - arrow.startX,
        arrow.y - (arrow.startY ?? arrow.y),
      );
      const maxDistance = arrow.maxDistance ?? ARROW_MAX_DISTANCE;
      if (distanceTraveled > maxDistance) {
        arrow.stuck = true;
      }

      platforms.forEach((platform) => {
        if (
          arrow.x < platform.x + platform.width &&
          arrow.x + 24 > platform.x &&
          arrow.y < platform.y + platform.height &&
          arrow.y + 8 > platform.y
        ) {
          arrow.stuck = true;
          if (arrow.vy > 0) {
            arrow.y = platform.y - 4;
          } else if (arrow.vy < 0) {
            arrow.y = platform.y + platform.height;
          }
          arrow.vx = 0;
          arrow.vy = 0;
        }
      });

      enemies.forEach((enemy) => {
        if (enemy.dead || arrow.hitEnemy) return;

        if (
          arrow.x < enemy.x + 28 &&
          arrow.x + 24 > enemy.x + 4 &&
          arrow.y < enemy.y + 28 &&
          arrow.y + 8 > enemy.y + 4
        ) {
          enemy.dead = true;
          arrow.hitEnemy = true;
          arrow.stuck = true;
          setScore((prev) => prev + ARROW_POINTS);

          for (let i = 0; i < 8; i += 1) {
            const angle = (Math.PI * 2 * i) / 8;
            game.arrowImpacts.push({
              x: enemy.x + 16,
              y: enemy.y + 16,
              vx: Math.cos(angle) * 3,
              vy: Math.sin(angle) * 3,
              life: 300,
              maxLife: 300,
              color: i % 2 === 0 ? "#FFD700" : "#FF6B6B",
              size: 4,
            });
          }
        }
      });
    } else if (arrow.stuck) {
      arrow.stuckTimer += deltaTime;
      arrow.stuckAlpha = Math.max(0, 1 - arrow.stuckTimer / ARROW_STUCK_TIME);
    }
  });

  game.arrows = game.arrows.filter((arrow) => {
    if (arrow.hitEnemy) return false;
    if (arrow.stuck && arrow.stuckTimer >= ARROW_STUCK_TIME) return false;
    if (
      !arrow.stuck &&
      (arrow.y > CANVAS_HEIGHT ||
        arrow.x < camera.x - 100 ||
        arrow.x > camera.x + CANVAS_WIDTH + 100)
    ) {
      return false;
    }
    return true;
  });

  game.arrowImpacts.forEach((impact) => {
    impact.x += impact.vx;
    impact.y += impact.vy;
    impact.vy += 0.2;
    impact.life -= deltaTime;
  });
  game.arrowImpacts = game.arrowImpacts.filter((impact) => impact.life > 0);

  game.particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= deltaTime;
  });
  game.particles = game.particles.filter((particle) => particle.life > 0);

  camera.x = Math.max(
    0,
    Math.min(player.x - CANVAS_WIDTH / 2, levelWidth - CANVAS_WIDTH),
  );

  game.debug.fps = Math.round(1000 / Math.max(1, deltaTime));
  if (game.debug.enabled && timestamp >= game.debug.nextSnapshotAt) {
    game.debug.nextSnapshotAt = timestamp + DEBUG_HUD_UPDATE_MS;
    setDebugHud({
      enabled: true,
      fps: game.debug.fps,
      playerX: Math.round(player.x),
      playerY: Math.round(player.y),
      playerVx: Number(player.vx.toFixed(2)),
      playerVy: Number(player.vy.toFixed(2)),
      onGround: player.onGround,
      coyoteMs: Math.round(player.coyoteTimer),
      jumpBufferMs: Math.round(player.jumpBufferTimer),
      enemies: game.enemies.length,
      arrows: game.arrows.length,
    });
  }
}
