export default interface PeerDetails {
    pubkey: Uint8Array,
    host: string,
    port: number,
    id: number
}