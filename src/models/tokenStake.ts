import { 
  BigDecimal,
  BigInt,
} from "@graphprotocol/graph-ts"

let GRT_TOKEN_DIVIDER = BigDecimal.fromString('1000000000000000000')

// A class to manage token stakes
export class TokenStake {
  amount: BigDecimal

  // Initialize a stake using the decimal value
  constructor(amount: BigDecimal) {
    this.amount = amount
  }

  // Helper to create a stake using the minor decimal units of tokens
  static fromRawTokens(rawTokens: BigInt): TokenStake {
    let amount = new BigDecimal(rawTokens)
    return new TokenStake(amount.div(GRT_TOKEN_DIVIDER))
  }

  // Convert a token stake to BigDecimal
  toBigDecimal(): BigDecimal {
    return this.amount
  }
}