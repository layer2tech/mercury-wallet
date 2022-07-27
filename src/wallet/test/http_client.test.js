//const axios = require('axios').default;
import axios from 'axios'
import { HttpClient, TIMEOUT, semaphore } from '../http_client';
import { handlePromiseRejection, checkForServerError } from '../error';

jest.mock('axios', () => jest.fn())

describe('HttpClient', function () {
    let client = new HttpClient("tor_endpoint.onion", true);
    let semaphoreSpy = jest.spyOn(semaphore, 'wait');
    const response = { data: "mock data" };

    afterEach(() => {
        expect(semaphoreSpy).toHaveBeenCalledTimes(1)
        jest.clearAllMocks()
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

describe('HttpClient timeout', function () {
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

    test('timeout error string', function () {
        console.log(`search result: ${timeout_err(TIMEOUT).message.search(/timeout of .*ms exceeded/)}`)
        expect(timeout_err(TIMEOUT).message.search(/timeout of .*ms exceeded/) !== -1).toEqual(true)
    })

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

describe('error handling', function () {
    describe('checkForServerError', function () {

        const status_err = { status: 400, data: "status err data" }
        const err_string = { data: "Error: an error string" }
        const err_string_lc = { data: "error: an error string" }
        const rate_limiter_error = { data: "Error: Not available until" }
        const error_object = { data: { error: "a message string" } }

        test('null', function () {
            checkForServerError(null)
        })

        test('undefined', function () {
            checkForServerError(undefined)
        })

        test('status err', function () {
            expect(() => { checkForServerError(status_err) }).toThrow(Error(`http status: ${status_err.status}, data: ${status_err.data}`))
        })

        test('string error', function () {
            expect(() => { checkForServerError(err_string) }).toThrow(Error(err_string.data))
        })

        test('string error lower case', function () {
            expect(() => { checkForServerError(err_string_lc) }).toThrow(Error(err_string_lc.data))
        })

        test('rate limiter error', function () {
            expect(() => { checkForServerError(rate_limiter_error) }).toThrow(Error("The server is currently unavailable due to a high request rate. Please try again."))
        })

        test('error object', function () {
            expect(() => { checkForServerError(error_object) }).toThrow(Error(JSON.stringify(error_object.data.error)))
        })

    })

    describe('handlePromiseRejection', function () {
        let timeout_err = { message: "timeout of 100ms exceeded" }
        let misc_err = { message: "misc err" }
        let blank_err = {}
        let timeout_msg = "a message string"

        test('timeout error', async function () {
            expect(() => { handlePromiseRejection(timeout_err, timeout_msg) }).toThrow(Error(`${timeout_msg}: ${timeout_err.message}`))
        })

        test('misc error', () => {
            expect(() => { handlePromiseRejection(misc_err, timeout_msg) }).toThrow(misc_err)
        })

        test('blank error', () => {
            expect(() => { handlePromiseRejection(blank_err, timeout_msg) }).toThrow(Error(blank_err))
        })


    })
})