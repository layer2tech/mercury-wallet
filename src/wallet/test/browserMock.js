import { JSDOM } from "jsdom";
const dom = new JSDOM();
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

global.MouseEvent = dom.window.MouseEvent;

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;
