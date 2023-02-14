import LightningClient from "../lightning";
import initLDK from "./initLDK";

let LDKClient: LightningClient | undefined;

export async function importLDK(electrum: string = 'prod'){
    console.log('Electrum: ', electrum)
    LDKClient = initLDK(electrum);
}

export function getLDKClient(){
    if(!LDKClient){
        throw new Error("LDKClient is not instantiated.");
    }

    return LDKClient;
}