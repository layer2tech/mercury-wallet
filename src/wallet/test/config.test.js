/**
 * @jest-environment ./jest-environment-uint8array-27.js
 */
import { Config } from "../";
import { networks } from "bitcoinjs-lib";

let cloneDeep = require("lodash.clonedeep");

describe("Config", function () {
  let config;
  const testing_mode = true;
  const network = networks.testnet;
  const const_config = new Config(network, testing_mode);

  beforeEach(() => {
    config = cloneDeep(const_config);
  });

  test("init", function () {
    expect(JSON.stringify(const_config)).toEqual(
      '{"network":{"messagePrefix":"\\u0018Bitcoin Signed Message:\\n","bech32":"tb","bip32":{"public":70617039,"private":70615956},"pubKeyHash":111,"scriptHash":196,"wif":239},"testing_mode":true,"jest_testing_mode":false,"required_confirmations":3,"electrum_fee_estimation_blocks":6,"swap_amounts":[100000,500000,1000000,5000000,10000000,50000000,100000000],"state_entity_endpoint":"http://u3fi7yqrkv7jp5vwoui3e5rlgasnokbzg5uc42eltmsqbdqcxudsqjad.onion, http://lmfcwtytaxvfy6t6e7eumka3cvg3p7mhuybdj7iiaasndcqpskp5iwad.onion","swap_conductor_endpoint":"http://u3fi7yqrkv7jp5vwoui3e5rlgasnokbzg5uc42eltmsqbdqcxudsqjad.onion, http://lmfcwtytaxvfy6t6e7eumka3cvg3p7mhuybdj7iiaasndcqpskp5iwad.onion","electrum_config":{"host":"https://blockstream.info/testnet/api","port":null,"protocol":"http","type":"electrs"},"block_explorer_endpoint":"https://mempool.space/testnet/tx/","tor_proxy":{"ip":"localhost","port":9060,"controlPassword":"","controlPort":9061},"min_anon_set":5,"notifications":true,"singleSwapMode":false,"tutorials":false,"swaplimit":1440}'
    );
  });

  test("getConfig", () => {
    expect(config.getConfig()).toEqual(config);
  });

  const revert_and_test = (prop) => {
    let obj = {};
    obj[`${prop}`] = const_config[`${prop}`];
    config.update(obj);
    expect(config).toEqual(const_config);
  };

  describe("update", function () {
    test("network", function () {
      const new_network = networks.bitcoin;
      config.update({ network: new_network });
      expect(config.network).toEqual(new_network);
      revert_and_test("network");
    });

    test("testing_mode", function () {
      const new_val = !config.testing_mode;
      config.update({ testing_mode: new_val });
      expect(config.testing_mode).toEqual(new_val);
      revert_and_test("testing_mode");
    });

    test("jest_testing_mode", function () {
      const new_val = !config.jest_testing_mode;
      config.update({ jest_testing_mode: new_val });
      expect(config.jest_testing_mode).toEqual(new_val);
      revert_and_test("jest_testing_mode");
    });

    test("required_confirmations", function () {
      const new_val = config.required_confirmations + 1;
      config.update({ required_confirmations: new_val });
      expect(config.required_confirmations).toEqual(new_val);
      revert_and_test("required_confirmations");
    });

    test("electrum_fee_estimation_blocks", function () {
      const new_val = config.electrum_fee_estimation_blocks + 1;
      config.update({ electrum_fee_estimation_blocks: new_val });
      expect(config.electrum_fee_estimation_blocks).toEqual(new_val);
      revert_and_test("electrum_fee_estimation_blocks");
    });

    test("swap_amounts", function () {
      const new_val = config.swap_amounts.concat([100]);
      config.update({ swap_amounts: new_val });
      expect(config.swap_amounts).toEqual(new_val);
      revert_and_test("swap_amounts");
    });

    test("state_entity_endpoint", function () {
      const new_val = config.state_entity_endpoint.concat("x");
      config.update({ state_entity_endpoint: new_val });
      expect(config.state_entity_endpoint).toEqual(new_val);
      revert_and_test("state_entity_endpoint");
    });

    test("swap_conductor_endpoint", function () {
      const new_val = config.swap_conductor_endpoint.concat("x");
      config.update({ swap_conductor_endpoint: new_val });
      expect(config.swap_conductor_endpoint).toEqual(new_val);
      revert_and_test("swap_conductor_endpoint");
    });

    test("electrum_config", function () {
      const new_val = {
        host: config.electrum_config.host.concat("x"),
        port: config.electrum_config.port + 1,
        protocol: config.electrum_config.protocol.concat("x"),
        type: config.electrum_config.type.concat("x"),
      };
      config.update({ electrum_config: new_val });
      expect(config.electrum_config).toEqual(new_val);
      revert_and_test("electrum_config");
    });

    test("block_explorer_endpoint", function () {
      const new_val = config.block_explorer_endpoint.concat("x");
      config.update({ block_explorer_endpoint: new_val });
      expect(config.block_explorer_endpoint).toEqual(new_val);
      revert_and_test("block_explorer_endpoint");
    });

    test("tor_proxy", function () {
      const new_val = {
        ip: config.tor_proxy.ip.concat("x"),
        port: config.tor_proxy.port + 1,
        controlPassword: config.tor_proxy.controlPassword.concat("x"),
        controlPort: config.tor_proxy.controlPort + 1,
      };
      config.update({ tor_proxy: new_val });
      expect(config.tor_proxy).toEqual(new_val);
      revert_and_test("tor_proxy");
    });

    test("min_anon_set", function () {
      const new_val = config.min_anon_set + 1;
      config.update({ min_anon_set: new_val });
      expect(config.min_anon_set).toEqual(new_val);
      revert_and_test("min_anon_set");
    });

    test("date_format", function () {
      const new_val = "test_date_format";
      config.update({ date_format: new_val });
      expect(config.date_format).toEqual(new_val);
      revert_and_test("date_format");
    });

    test("notifications", function () {
      const new_val = !config.notifications;
      config.update({ notifications: new_val });
      expect(config.notifications).toEqual(new_val);
      revert_and_test("notifications");
    });

    test("singleSwapMode", function () {
      const new_val = !config.singleSwapMode;
      config.update({ singleSwapMode: new_val });
      expect(config.singleSwapMode).toEqual(new_val);
      revert_and_test("singleSwapMode");
    });

    test("tutorials", function () {
      const new_val = !config.tutorials;
      config.update({ tutorials: new_val });
      expect(config.tutorials).toEqual(new_val);
      revert_and_test("tutorials");
    });

    test("swaplimit", function () {
      const new_val = config.swaplimit + 1;
      config.update({ swaplimit: new_val });
      expect(config.swaplimit).toEqual(new_val);
      revert_and_test("swaplimit");
    });
  });
});

