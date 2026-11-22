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
