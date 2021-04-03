import { ethereum } from "@graphprotocol/graph-ts";
import { Indexer, ItsOnlyWaferThinBadge } from "../../generated/schema";

export function awardItsOnlyWaferThinBadge(
  cachedIndexer: Indexer,
  updatedIndexer: Indexer,
  block: ethereum.Block
): void {
  let becomesOverDelegated =
    !cachedIndexer.isOverDelegated && updatedIndexer.isOverDelegated;

  if (becomesOverDelegated) {
    let badge = new ItsOnlyWaferThinBadge(
      updatedIndexer.id.concat("-").concat(block.number.toString())
    );
    badge.awardedAtBlock = block.number;
    badge.awardedAtTimestamp = block.timestamp;
    badge.save();
  }
}
