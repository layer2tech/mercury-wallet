import LightningClient from "../LightningClient";
import { initializeLDK } from "./initializeLDK";
import { MockLightningClient } from "../../../test/mocks/MockLightningClient";

class LDKClientFactory {
  private static instance: LDKClientFactory;
  private client: LightningClient | MockLightningClient | null;

  private constructor() {
    this.client = null;
  }

  public static getInstance(): LDKClientFactory {
    if (!LDKClientFactory.instance) {
      LDKClientFactory.instance = new LDKClientFactory();
    }
    return LDKClientFactory.instance;
  }

  public async createLDKClient(
    wallet_name: string,
    bitcoind_client: string = "prod"
  ): Promise<void> {
    console.log(
      "[LDKClientFactory/createLDKClient]: bitcoind_client settings: ",
      bitcoind_client
    );

    if (!this.client) {
      if (bitcoind_client === "mock") {
        this.client = new MockLightningClient();
        return;
      }
      try {
        const initLDK = await initializeLDK(wallet_name, bitcoind_client);
        if (initLDK) {
          this.client = new LightningClient(initLDK);
        } else {
          throw new Error(
            "[LDKClientFactory/createLDKClient]: initLDK undefined \n"
          );
        }
      } catch (e) {
        throw new Error(
          `[LDKClientFactory/createLDKClient]: Couldn't await initializeLDK(bitcoind_client);  \n ${e} \n`
        );
      }
    }
  }

  public isInitialized() {
    return this.client !== null;
  }

  public destroy() {
    this.client = null;
  }

  public getLDKClient(): LightningClient | MockLightningClient {
    if (!this.client) {
      throw new Error(
        "[LDKClientFactory/getLDKClient]: Can't getLDKClient - LDKClient is not instantiated."
      );
    }

    return this.client;
  }
}

export default LDKClientFactory.getInstance();
