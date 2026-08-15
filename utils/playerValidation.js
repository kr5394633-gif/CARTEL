function checkQueue(player) {
  if (!player) return { valid: false, error: 'No player found' };
  if (!player.queue || player.queue.length === 0) {
    return { valid: false, error: 'Queue is empty' };
  }
  return { valid: true, queue: player.queue };
}

function checkCurrentTrack(player) {
  if (!player) return { valid: false, error: 'No player found' };
  if (!player.current) {
    return { valid: false, error: 'No track currently playing' };
  }
  return { valid: true, track: player.current };
}

function checkQueueOrTrack(player) {
  if (!player) return { valid: false, error: 'No player found' };
  if (!player.current && (!player.queue || player.queue.length === 0)) {
    return { valid: false, error: 'No music in queue' };
  }
  return { 
    valid: true, 
    current: player.current,
    queue: player.queue || []
  };
}

module.exports = {
  checkQueue,
  checkCurrentTrack,
  checkQueueOrTrack
};
