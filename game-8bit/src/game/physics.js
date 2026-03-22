export function updateJumpAssistTimers(player, deltaTime, coyoteTimeMs) {
  player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - deltaTime)
  player.coyoteTimer = player.onGround
    ? coyoteTimeMs
    : Math.max(0, player.coyoteTimer - deltaTime)
}

export function tryConsumeBufferedJump(player, jumpForce) {
  const canUseBufferedJump = player.onGround || player.coyoteTimer > 0
  if (!canUseBufferedJump || player.jumpBufferTimer <= 0) return false

  player.vy = jumpForce
  player.onGround = false
  player.jumpBufferTimer = 0
  player.coyoteTimer = 0
  player.vx += player.supportVelocityX || 0
  player.supportVelocityX = 0
  player.supportedByMobileId = null
  return true
}
