/// <reference types="vitest/globals" />

import type { Mock, MockInstance } from "vitest";

declare global {
  namespace Vi {
    interface Mock<T = any, Y extends any[] = any> extends MockInstance<T, Y> {}
  }
  var vi: {
    fn: <T, Y extends any[]>(implementation?: (...args: Y) => T) => Mock<T, Y>;
    mock: <T, Y extends any[]>(implementation?: (...args: Y) => T) => Mock<T, Y>;
    spyOn: <T, K extends keyof T>(object: T, method: K) => Mock<T[K]>;
    clearAllMocks: () => void;
    resetAllMocks: () => void;
    restoreAllMocks: () => void;
    useFakeTimers: () => void;
    useRealTimers: () => void;
    setSystemTime: (date: Date | number) => void;
    getMockConfig: () => any;
    unstubAllEnvs: () => void;
    stubEnv: (name: string, value: string) => void;
    unmock: (moduleName: string) => void;
  };
}