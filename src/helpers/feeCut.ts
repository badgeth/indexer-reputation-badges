import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

// GRT Token has 18 decimals
let FEE_CUT_DIVIDER = BigDecimal.fromString("1000000");

export function feeCutToDecimalRatio(rawAmount: BigInt): BigDecimal {
  let ratio = new BigDecimal(rawAmount);
  return ratio.div(FEE_CUT_DIVIDER);
}
