//const axios = require('axios').default;
console.log("electrs.test.js");
import axios from "axios";
import { TIMEOUT, semaphore } from "../http_client";
import { ElectrsClient } from "../electrs";

jest.mock("axios", () => jest.fn());

describe("ElectrsClient", function () {
  let client = new ElectrsClient("tor_endpoint.onion", true);
  let semaphoreSpy = jest.spyOn(semaphore, "wait");
  const response = { data: "mock data" };

  afterEach(() => {
    jest.restoreAllMocks();
    expect(semaphoreSpy).toHaveBeenCalledTimes(1);
  });

  beforeEach(() => {
    axios.mockResolvedValueOnce(response);
  });

  test("get", async function () {
    const actual = await ElectrsClient.get(
      client.endpoint,
      "test/path",
      "params"
    );
    expect(actual).toEqual(response.data);
    expect(axios).toBeCalledWith({
      method: "get",
      url: "tor_endpoint.onion/test/path/params",
      headers: { Accept: "application/json" },
      timeout: TIMEOUT,
    });
  });

  test("get with timeout", async function () {
    const timeout = 1234;
    const actual = await ElectrsClient.get(
      client.endpoint,
      "test/path",
      "params",
      timeout
    );
    expect(actual).toEqual(response.data);
    expect(axios).toBeCalledWith({
      method: "get",
      url: "tor_endpoint.onion/test/path/params",
      headers: { Accept: "application/json" },
      timeout: timeout,
    });
  });

  test("post", async function () {
    const actual = await ElectrsClient.post(
      client.endpoint,
      "test/path",
      "body"
    );
    expect(actual).toEqual(response.data);
    expect(axios).toBeCalledWith({
      method: "post",
      url: "tor_endpoint.onion/test/path",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: TIMEOUT,
      data: "body",
    });
  });

  test("post with timeout", async function () {
    const timeout = 1234;
    const actual = await ElectrsClient.post(
      client.endpoint,
      "test/path",
      "body",
      timeout
    );
    expect(actual).toEqual(response.data);
    expect(axios).toBeCalledWith({
      method: "post",
      url: "tor_endpoint.onion/test/path",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: timeout,
      data: "body",
    });
  });
});

describe("ElectrsClient timeout", function () {
  let client = new ElectrsClient("tor_endpoint.onion", true);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    axios.mockRejectedValueOnce(timeout_err(TIMEOUT));
  });

  const timeout_err = (timeout) => {
    return new Error(`timeout of ${timeout}ms exceeded`);
  };

  test("get", async function () {
    await expect(
      ElectrsClient.get(client.endpoint, "test/path", "params")
    ).rejects.toThrow(
      Error(`Electrum API request timed out: ${timeout_err(TIMEOUT).message}`)
    );
    expect(axios).toBeCalledWith({
      method: "get",
      url: "tor_endpoint.onion/test/path/params",
      headers: { Accept: "application/json" },
      timeout: TIMEOUT,
    });
  });

  test("post", async function () {
    await expect(
      ElectrsClient.post(client.endpoint, "test/path", "body")
    ).rejects.toThrow(
      Error(`Electrum API request timed out: ${timeout_err(TIMEOUT).message}`)
    );
    expect(axios).toBeCalledWith({
      method: "post",
      url: "tor_endpoint.onion/test/path",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: TIMEOUT,
      data: "body",
    });
  });
});
