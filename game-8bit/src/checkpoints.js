const DEFAULT_FLAG_WIDTH = 20
const DEFAULT_FLAG_HEIGHT = 56
const PLAYER_TOUCH_PADDING = 6

const intersects = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y

export function createCheckpoints(definitions = []) {
  return definitions.map((checkpoint, index) => {
    const x = checkpoint.x ?? 0
    const y = checkpoint.y ?? 0

    return {
      id: checkpoint.id ?? `cp-${index + 1}`,
      label: checkpoint.label ?? `CP-${index + 1}`,
      x,
      y,
      width: checkpoint.width ?? DEFAULT_FLAG_WIDTH,
      height: checkpoint.height ?? DEFAULT_FLAG_HEIGHT,
      respawn: checkpoint.respawn ?? { x: x - 16, y: y - 32 },
      active: false,
    }
  })
}

export function activateCheckpointIfTouched(player, checkpoints = [], playerSize = 32) {
  if (!checkpoints.length) return null

  const playerRect = {
    x: player.x + PLAYER_TOUCH_PADDING,
    y: player.y + PLAYER_TOUCH_PADDING,
    width: Math.max(8, playerSize - PLAYER_TOUCH_PADDING * 2),
    height: Math.max(8, playerSize - PLAYER_TOUCH_PADDING * 2),
  }

  for (const checkpoint of checkpoints) {
    const checkpointRect = {
      x: checkpoint.x - checkpoint.width / 2,
      y: checkpoint.y - checkpoint.height,
      width: checkpoint.width,
      height: checkpoint.height,
    }

    if (!intersects(playerRect, checkpointRect)) continue
    if (checkpoint.active) return null

    checkpoints.forEach((cp) => {
      cp.active = false
    })
    checkpoint.active = true
    return checkpoint
  }

  return null
}

export function getActiveCheckpoint(checkpoints = []) {
  return checkpoints.find((checkpoint) => checkpoint.active) ?? null
}

export function getCheckpointStatus(checkpoints = []) {
  const active = getActiveCheckpoint(checkpoints)
  const activeIndex = active ? checkpoints.findIndex((checkpoint) => checkpoint.id === active.id) + 1 : 0
  return {
    total: checkpoints.length,
    activeIndex,
    activeLabel: active?.label ?? 'START',
  }
}

export function getRespawnPoint(spawnPoint, checkpoints = []) {
  const active = getActiveCheckpoint(checkpoints)
  if (!active) {
    return {
      x: spawnPoint?.x ?? 0,
      y: spawnPoint?.y ?? 0,
    }
  }

  return {
    x: active.respawn?.x ?? active.x - 16,
    y: active.respawn?.y ?? active.y - 32,
  }
}
