import "@testing-library/jest-dom";

// Mock ResizeObserver for recharts compatibility in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
