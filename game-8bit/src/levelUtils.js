import { LEVELS } from './levels'

const REQUIRED_LEVEL_KEYS = ['id', 'name', 'levelWidth', 'spawnPoint', 'platforms', 'coins', 'enemies']
let levelsValidated = false

const validateLevel = (level) => {
  const missingKeys = REQUIRED_LEVEL_KEYS.filter((key) => level[key] == null)
  if (missingKeys.length > 0) {
    throw new Error(`Invalid level ${level?.id ?? 'unknown'}: missing ${missingKeys.join(', ')}`)
  }

  if (level.portal != null) {
    const { x, y, width, height, requiresBossDefeat } = level.portal
    const portalFields = [x, y, width, height]
    if (!portalFields.every((value) => typeof value === 'number')) {
      throw new Error(`Invalid level ${level.id}: portal must include numeric x, y, width and height`)
    }
    if (requiresBossDefeat != null && typeof requiresBossDefeat !== 'boolean') {
      throw new Error(`Invalid level ${level.id}: portal.requiresBossDefeat must be boolean when provided`)
    }
  }

  if (typeof level.spawnPoint.x !== 'number' || typeof level.spawnPoint.y !== 'number') {
    throw new Error(`Invalid level ${level.id}: spawnPoint must have numeric x and y`)
  }

  if (!Array.isArray(level.platforms) || !Array.isArray(level.coins) || !Array.isArray(level.enemies)) {
    throw new Error(`Invalid level ${level.id}: platforms, coins and enemies must be arrays`)
  }

  if (level.checkpoints != null && !Array.isArray(level.checkpoints)) {
    throw new Error(`Invalid level ${level.id}: checkpoints must be an array when present`)
  }
}

const validateLevels = () => {
  if (levelsValidated) return
  if (!Array.isArray(LEVELS) || LEVELS.length === 0) {
    throw new Error('No levels configured')
  }

  LEVELS.forEach(validateLevel)
  levelsValidated = true
}

export function loadLevel(levelId) {
  validateLevels()
  return LEVELS.find((level) => level.id === levelId) || LEVELS[0]
}

export function hasNextLevel(currentLevelId) {
  validateLevels()
  return currentLevelId < LEVELS.length
}

export function getNextLevel(currentLevelId) {
  validateLevels()
  const currentIndex = LEVELS.findIndex((level) => level.id === currentLevelId)
  if (currentIndex < LEVELS.length - 1) {
    return LEVELS[currentIndex + 1]
  }
  return null
}
