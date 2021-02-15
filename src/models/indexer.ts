import { 
    Address,
    BigDecimal,
    BigInt,
} from "@graphprotocol/graph-ts"

import {
    Indexer,
} from "../../generated/schema"

export function atAddress(address: Address): Indexer | null {
    let indexer = Indexer.load(address.toHex())
    if(indexer == null) {
        indexer = new Indexer(address.toHex())
        indexer.ownStake = new BigDecimal(BigInt.fromI32(0))
    }
    return indexer
}