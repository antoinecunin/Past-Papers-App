/// <reference types="jest" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveProperty(propertyPath: string, value?: unknown): R;
    }
  }
}

export {};