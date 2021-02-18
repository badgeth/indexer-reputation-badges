import { 
  BigDecimal,
  BigInt,
} from "@graphprotocol/graph-ts"

export let INT_ZERO = BigInt.fromI32(0)
export let DECIMAL_ZERO = BigDecimal.fromString('0')
export let DECIMAL_SIXTEEN = BigDecimal.fromString('16')
export let PROTOCOL_GENESIS = BigInt.fromI32(1607844057) // Timestamp for Ethereum Block #11446786