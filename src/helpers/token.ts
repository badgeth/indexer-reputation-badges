import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

// GRT Token has 18 decimals
let TOKEN_DIVIDER = BigDecimal.fromString("1000000000000000000");

export function tokenAmountToDecimal(rawAmount: BigInt): BigDecimal {
  let amount = new BigDecimal(rawAmount);
  return amount.div(TOKEN_DIVIDER);
}
