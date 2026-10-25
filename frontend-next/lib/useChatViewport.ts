'use client';
/**
 * Keeps a full-screen chat exactly the size of what the person can see.
 *
 * Phones change the visible area while you use them: the address bar hides
 * and shows, and the keyboard covers the bottom half. CSS `100vh` is the
 * tallest of these, so a chat sized with it is taller than the screen. The
 * page then scrolls, the top of the chat slides under the app bar, and a gap
 * opens under the message box. The visual viewport is the visible area, so
 * the chat follows it: `--chat-vh` is its height and `--chat-top` its offset.
 * While the chat is open the page behind it can't scroll.
 */
import { useEffect } from 'react';

export function useChatViewport(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    const vv = window.visualViewport;
    const previous = { html: root.style.overflow, body: body.style.overflow, overscroll: body.style.overscrollBehavior };

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = vv ? vv.height : window.innerHeight;
        const top = vv ? vv.offsetTop : 0;
        root.style.setProperty('--chat-vh', `${Math.round(height)}px`);
        root.style.setProperty('--chat-top', `${Math.round(top)}px`);
        // Some browsers still nudge the page when the keyboard opens; undo it.
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      });
    };

    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      root.style.removeProperty('--chat-vh');
      root.style.removeProperty('--chat-top');
      root.style.overflow = previous.html;
      body.style.overflow = previous.body;
      body.style.overscrollBehavior = previous.overscroll;
    };
  }, [enabled]);
}
