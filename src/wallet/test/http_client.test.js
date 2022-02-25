//const axios = require('axios').default;
import axios from 'axios'
import { HttpClient, TIMEOUT, semaphore } from '../http_client';

jest.mock('axios', () => jest.fn())

describe('http_client', function () {
    let client = new HttpClient("tor_endpoint.onion", true);
    let semaphoreSpy = jest.spyOn(semaphore, 'wait');
    const response = { data: "mock data" };

    afterEach(() => {
        jest.restoreAllMocks();
        expect(semaphoreSpy).toHaveBeenCalledTimes(1)
    });
        
    beforeEach(() => {
        axios.mockResolvedValueOnce(response)
    });

    test('get', async function () {
        const actual = await client.get("test/path", "params")
        expect(actual).toEqual(response.data)
        expect(axios).toBeCalledWith({
            method: 'get',
            url: "tor_endpoint.onion/test/path/params",
            headers: { 'Accept': 'application/json' },
            timeout: TIMEOUT
        });
    })

    test('get with timeout', async function () {
        const timeout = 1234
        const actual = await client.get("test/path", "params", timeout)
        expect(actual).toEqual(response.data)
        expect(axios).toBeCalledWith({
            method: 'get',
            url: "tor_endpoint.onion/test/path/params",
            headers: { 'Accept': 'application/json' },
            timeout: timeout
        });
    });

    test('post', async function () {
        const actual = await client.post("test/path", "body")
        expect(actual).toEqual(response.data)
        expect(axios).toBeCalledWith({
            method: 'post',
            url: "tor_endpoint.onion/test/path",
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: TIMEOUT,
            data: "body"
        });
    });

    test('post with timeout', async function () {
        const timeout = 1234
        const actual = await client.post("test/path", "body", timeout)
        expect(actual).toEqual(response.data)
        expect(axios).toBeCalledWith({
            method: 'post',
            url: "tor_endpoint.onion/test/path",
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: timeout,
            data: "body"
        });
        
    });

});

describe('http_client timeout', function () {
    let client = new HttpClient("tor_endpoint.onion", true)
    
    afterEach(() => {
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        axios.mockRejectedValueOnce(timeout_err(TIMEOUT))
    })

    const timeout_err = (timeout) => {
        return new Error(`timeout of ${timeout}ms exceeded`)
    }

    test('get', async function () {
        await expect(client.get("test/path", "params")).rejects.
            toThrow(Error(`Mercury API request timed out: ${timeout_err(TIMEOUT).message}`))
        expect(axios).toBeCalledWith({
            method: 'get',
            url: "tor_endpoint.onion/test/path/params",
            headers: { 'Accept': 'application/json' },
            timeout: TIMEOUT
        });
    });

    test('post', async function () {
        await expect(client.post("test/path", "body")).rejects.
            toThrow(Error(`Mercury API request timed out: ${timeout_err(TIMEOUT).message}`))
        expect(axios).toBeCalledWith({
            method: 'post',
            url: "tor_endpoint.onion/test/path",
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: TIMEOUT,
            data: "body"
        });
    });
    
});

