import LightningClient from "../lightning.js";
import initLDK from "./initLDK.js";

let LDKClient: LightningClient | undefined;

export async function importLDK(electrum: string = 'prod'){
    LDKClient = initLDK(electrum);
}

export function getLDKClient(){
    if(!LDKClient){
        throw new Error("LDKClient is not instantiated.");
    }

    return LDKClient;
}