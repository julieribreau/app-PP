// Doublure du client API pour les tests de composants :
// jest.mock("@/lib/api/client", () => require("@/test/api-mock").apiModule).
import { jest } from "@jest/globals";
import { ApiError } from "@nutrion/api-port";

type Call = (...args: unknown[]) => Promise<unknown>;

export const apiMock = {
  get: jest.fn<Call>(),
  post: jest.fn<Call>(),
  patch: jest.fn<Call>(),
  delete: jest.fn<Call>(),
};

export const apiModule = {
  api: apiMock,
  ApiError,
  appFetch: jest.fn<Call>(),
  uploadFile: jest.fn<Call>(),
  cartTokens: {
    get: jest.fn(async () => null),
    set: jest.fn<Call>(),
    clear: jest.fn<Call>(),
    captureFrom: jest.fn<Call>(),
  },
};

export const routerMock = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  canGoBack: () => true,
};
