import { KeysManager } from "lightningdevkit";

class YourKeysManager extends KeysManager {
    init_keys_manager(
        key_seed: Uint8Array
    ) {
        const date = new Date();
        return KeysManager.constructor_new(key_seed, 
            BigInt(date.getTime() / 1000), 
            date.getTime() * 1000
        );
    }
}

export default YourKeysManager;