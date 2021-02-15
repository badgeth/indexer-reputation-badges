import { 
  BigDecimal,
  BigInt,
} from "@graphprotocol/graph-ts"

let GRT_TOKEN_DIVIDER = BigDecimal.fromString('1000000000000000000')

export class TokenStake {
  amount: BigDecimal

  constructor(amount: BigDecimal) {
    this.amount = amount
  }

  static fromRawTokens(rawTokens: BigInt): TokenStake {
    let amount = new BigDecimal(rawTokens)
    return new TokenStake(amount.div(GRT_TOKEN_DIVIDER))
  }

  toBigDecimal(): BigDecimal {
    return this.amount
  }
}