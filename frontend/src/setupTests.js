import "@testing-library/jest-dom/vitest";

// jsdom не реализует matchMedia, а он нужен хуку useTheme из HeroUI.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom не реализует ResizeObserver, а он нужен Toast из HeroUI (уведомления в App).
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
