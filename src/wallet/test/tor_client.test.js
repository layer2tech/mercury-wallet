/**
 * @jest-environment node
 */

var TorClient = require('../../../tor-adapter/server/tor_client');
var path = require('path');
const winston = require('winston');
let cloneDeep = require('lodash.clonedeep');

describe('TorClient', function () {
    const ip = 'localhost';
    const port = 90000;
    const controlPassword = 'controlPassword';
    const controlPort = port + 1;
    const dataPath = "/path/to/tor/data"
    const geoIpFile = "geoIpFile";
    const geoIpV6File = "geoIpV6File"
    const logDir = path.join('.', 'data', 'tmp');

    const logger = winston.createLogger({
        level: 'debug',
        format: winston.format.combine(
            winston.format.json(),
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            })
        ),
        defaultMeta: { service: 'user-service' },
        transports: [
            new winston.transports.File({ filename: path.join(logDir, 'info.log'), level: 'info' }),
            new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
            new winston.transports.File({ filename: path.join(logDir, 'debug.log'), level: 'debug' }),
            new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
        ]
    })

    let client;

    beforeEach(() => {
        client = new TorClient(ip, port, controlPassword,
            controlPort, dataPath, geoIpFile, geoIpV6File, logger);
    })

    test('newSocksAuthentication', function () {
        const initialHostname = cloneDeep(client.hostname);
        expect(initialHostname.substring(0, 8)).toEqual('socks://');
        expect(initialHostname.substring(44, initialHostname.length)).toEqual(`:@${ip}:${port}`);
        client.newSocksAuthentication()
        expect(client.hostname.substring(0, 8)).toEqual('socks://');
        expect(client.hostname.substring(44, initialHostname.length)).toEqual(`:@${ip}:${port}`);
        expect(client.hostname.substring(8, 44)).not.toEqual(initialHostname.substring(8, 44))
    })

    test('confirmNewSocksAuthentication - ip not updated', async function () {
        let spy = jest.spyOn(client, 'getip').mockImplementation(() => Promise.resolve('1.1.1.1'));
        await expect(client.confirmNewSocksAuthentication()).rejects.toThrowError("Failed to get new Tor exit IP after 3 attempts");
        expect(spy).toHaveBeenCalledTimes(6);
    })

    test('confirmNewSocksAuthentication - ip updated', async function () {
        let count = 0;
        let spy = jest.spyOn(client, 'getip').mockImplementation(() => {
            count = count + 1;
            return Promise.resolve(`1.1.1.${count}`);
        });
        await expect(client.confirmNewSocksAuthentication()).resolves.toEqual(undefined);
        expect(spy).toHaveBeenCalledTimes(2);
    })
})
