import { ethereum } from "@graphprotocol/graph-ts";
import {
  BadgeStats,
  Indexer,
  ItsOnlyWaferThinBadge,
} from "../../generated/schema";
import { badgeStatsId } from "../helpers/constants";

export function initializeBadgeStats(block: ethereum.Block): BadgeStats {
  let badgeStats = BadgeStats.load(badgeStatsId());
  if (badgeStats == null) {
    badgeStats.itsOnlyWaferThinBadgeCount = 0;
    badgeStats.lastAwardedTimestamp = block.timestamp;
    badgeStats.lastAwardedBlock = block.number;
  }
  return badgeStats as BadgeStats;
}

export function awardItsOnlyWaferThinBadge(
  cachedIndexer: Indexer,
  updatedIndexer: Indexer,
  block: ethereum.Block
): void {
  let becomesOverDelegated =
    !cachedIndexer.isOverDelegated && updatedIndexer.isOverDelegated;

  if (becomesOverDelegated) {
    let badgeStats = initializeBadgeStats(block);

    let badge = new ItsOnlyWaferThinBadge(
      updatedIndexer.id.concat("-").concat(block.number.toString())
    );

    let itsOnlyWaferThinBadgeCount = badgeStats.itsOnlyWaferThinBadgeCount + 1;

    badgeStats.itsOnlyWaferThinBadgeCount = itsOnlyWaferThinBadgeCount;
    badgeStats.save();

    badge.awardedAtBlock = block.number;
    badge.awardedAtTimestamp = block.timestamp;
    badge.badgeNumber = itsOnlyWaferThinBadgeCount;
    badge.save();
  }
}
