import { useEffect } from 'react';

const ANNOUNCER_ID = 'mx-page-announcer';

function getAnnouncer() {
  let el = document.getElementById(ANNOUNCER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = ANNOUNCER_ID;
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    // Visually hidden but accessible to screen readers
    el.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Announces a page navigation message to screen readers via an aria-live region.
 * @param {string|null} message - Text to announce, e.g. "MX Plants course page opened"
 * @param {*} [announcementKey] - Optional key; when changed, re-announces even if message is unchanged
 */
export default function usePageAnnouncement(message, announcementKey) {
  useEffect(() => {
    if (!message) { return undefined; }
    const el = getAnnouncer();
    // Clear first so NVDA picks up the new text as a change
    el.textContent = '';
    const timer = setTimeout(() => { el.textContent = message; }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, announcementKey]);
}
