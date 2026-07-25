// the scene is laid out in desktop pixels: one shared coordinate space that
// every window cuts its own view out of.

/**
 * where this window's drawing area sits on the desktop.
 *
 * screenX/screenY report the window frame, not the page, so using them raw
 * leaves each window's slice of the scene offset by the height of its own
 * toolbar. subtracting the chrome is what makes two windows line up.
 */
export function readViewport() {
  const border = Math.max(0, Math.round((outerWidth - innerWidth) / 2));
  const chrome = Math.max(0, outerHeight - innerHeight - border);
  return {
    x: Math.round(screenX + border),
    y: Math.round(screenY + chrome),
    w: innerWidth,
    h: innerHeight,
  };
}

export function rectCenter(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function isEmbedded() {
  try {
    return window.self !== window.top;
  } catch {
    // cross origin frame, so definitely embedded
    return true;
  }
}

/**
 * open a companion window beside this one, clamped to the current screen.
 * returns false when the browser blocks it, so the ui can say so.
 */
export function openCompanion() {
  const availLeft = screen.availLeft ?? 0;
  const availTop = screen.availTop ?? 0;
  const width = Math.round(Math.min(560, screen.availWidth * 0.42));
  const height = Math.round(Math.min(560, screen.availHeight * 0.6));

  const gap = 24;
  let left = screenX + outerWidth + gap;
  if (left + width > availLeft + screen.availWidth) {
    left = screenX - width - gap;
  }
  left = Math.round(
    Math.min(Math.max(left, availLeft), availLeft + screen.availWidth - width),
  );
  const top = Math.round(
    Math.min(
      Math.max(screenY + 40, availTop),
      availTop + screen.availHeight - height,
    ),
  );

  const features = `popup=yes,width=${width},height=${height},left=${left},top=${top}`;
  const opened = window.open(location.href, "_blank", features);
  opened?.focus();
  return Boolean(opened);
}
