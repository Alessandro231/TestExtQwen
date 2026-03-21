export function getAttackHitbox(player, direction, playerSize = 32) {
  const x = player.x
  const y = player.y

  if (direction === 'right') {
    return { x: x + playerSize, y: y + 4, width: 40, height: 24 }
  }
  if (direction === 'left') {
    return { x: x - 40, y: y + 4, width: 40, height: 24 }
  }
  if (direction === 'up') {
    return { x, y: y - 32, width: 32, height: 32 }
  }
  return { x: 0, y: 0, width: 0, height: 0 }
}
