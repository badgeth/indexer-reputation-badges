import { ethereum } from "@graphprotocol/graph-ts";
import { ItsOnlyWaferThinBadge } from "../../generated/schema";

export function becomesOverDelegated(
  isOverDelegated: boolean,
  updatedIsOverDelegated: boolean
): boolean {
  return !isOverDelegated && updatedIsOverDelegated;
}

export function awardItsOnlyWaferThinBadge(
  id: string,
  block: ethereum.Block
): void {
  let badge = new ItsOnlyWaferThinBadge(
    id.concat("-").concat(block.number.toString())
  );
  badge.awardedAtBlock = block.number;
  badge.awardedAtTimestamp = block.timestamp;
  badge.save();
}
