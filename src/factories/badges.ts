import { ethereum } from "@graphprotocol/graph-ts";
import {
  BadgeOverview,
  Indexer,
  ItsOnlyWaferThinBadge,
} from "../../generated/schema";
import { badgeOverviewId, oneBI, zeroBI } from "../helpers/constants";

export function initializeBadgeOverview(block: ethereum.Block): BadgeOverview {
  let badgeOverview = BadgeOverview.load(badgeOverviewId());
  if (badgeOverview == null) {
    badgeOverview = new BadgeOverview(badgeOverviewId());
    badgeOverview.itsOnlyWaferThinBadgeCount = zeroBI();
    badgeOverview.lastAwardedTimestamp = block.timestamp;
    badgeOverview.lastAwardedBlock = block.number;

    badgeOverview.save();
  }
  return badgeOverview as BadgeOverview;
}

export function awardItsOnlyWaferThinBadge(
  cachedIndexer: Indexer,
  updatedIndexer: Indexer,
  block: ethereum.Block
): void {
  let becomesOverDelegated =
    !cachedIndexer.isOverDelegated && updatedIndexer.isOverDelegated;

  if (becomesOverDelegated) {
    let badgeOverview = initializeBadgeOverview(block);

    let badge = new ItsOnlyWaferThinBadge(
      updatedIndexer.id.concat("-").concat(block.number.toString())
    );

    let itsOnlyWaferThinBadgeCount = badgeOverview.itsOnlyWaferThinBadgeCount.plus(
      oneBI()
    );

    badgeOverview.lastAwardedTimestamp = block.timestamp;
    badgeOverview.lastAwardedBlock = block.number;
    badgeOverview.itsOnlyWaferThinBadgeCount = itsOnlyWaferThinBadgeCount;
    badgeOverview.save();

    badge.awardedAtBlock = block.number;
    badge.awardedAtTimestamp = block.timestamp;
    badge.badgeNumber = itsOnlyWaferThinBadgeCount;
    badge.save();
  }
}
