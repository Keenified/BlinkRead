export function pauseAnimation(element) {
  element.style.animationPlayState = 'paused';
}

export function resumeAnimation(element) {
  element.style.animationPlayState = 'running';
}
