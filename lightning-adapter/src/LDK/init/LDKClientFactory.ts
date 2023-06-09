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
        const initLDK = await initializeLDK(bitcoind_client);
        if (initLDK) {
          this.client = new LightningClient(initLDK);
        } else {
          throw new Error(
            "[LDKClientFactory/createLDKClient]: Couldn't initialize LDK \n"
          );
        }
      } catch (e) {
        throw new Error(
          `[LDKClientFactory/createLDKClient]: Couldn't initialize LDK  \n ${e} \n`
        );
      }
    }
  }

  public getLDKClient(): LightningClient | MockLightningClient {
    if (!this.client) {
      throw new Error(
        "[LDKClientFactory/getLDKClient]: LDKClient is not instantiated."
      );
    }

    return this.client;
  }
}

export default LDKClientFactory.getInstance();
