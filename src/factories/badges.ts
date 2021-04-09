import { ethereum } from "@graphprotocol/graph-ts";
import {
  AnIndexerIsBornBadge,
  BadgeAward,
  BadgeDefinition,
  BadgeOverview,
  Indexer,
  ItsOnlyWaferThinBadge,
} from "../../generated/schema";
import { badgeOverviewId, oneBI, zeroBI } from "../helpers/constants";

export function initializeBadgeOverview(block: ethereum.Block): BadgeOverview {
  let badgeOverview = BadgeOverview.load(badgeOverviewId());
  if (badgeOverview == null) {
    badgeOverview = new BadgeOverview(badgeOverviewId());
    badgeOverview.badgeDefinitionCount = 1;
    badgeOverview.itsOnlyWaferThinBadgeCount = zeroBI();
    badgeOverview.anIndexerIsBornBadgeCount = zeroBI();
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

    let badgeCount = badgeOverview.itsOnlyWaferThinBadgeCount.plus(oneBI());

    badgeOverview.itsOnlyWaferThinBadgeCount = badgeCount;
    badgeOverview.save();

    badge.awardedAtBlock = block.number;
    badge.awardedAtTimestamp = block.timestamp;
    badge.badgeNumber = badgeCount;
    badge.save();
  }
}

export function awardAnIndexerIsBornBadge(
  updatedIndexer: Indexer,
  block: ethereum.Block
): void {
  let indexerIsCreated = updatedIndexer.createdAtTimestamp == block.timestamp;

  if (indexerIsCreated) {
    let badgeOverview = initializeBadgeOverview(block);

    let badge = new AnIndexerIsBornBadge(
      updatedIndexer.id.concat("-").concat(block.number.toString())
    );

    let badgeCount = badgeOverview.anIndexerIsBornBadgeCount.plus(oneBI());

    badgeOverview.anIndexerIsBornBadgeCount = badgeCount;
    badgeOverview.save();

    badge.awardedAtBlock = block.number;
    badge.awardedAtTimestamp = block.timestamp;
    badge.badgeNumber = badgeCount;
    badge.save();
  }
}

export function awardBadge(
  address: string,
  block: ethereum.Block,
  badgeDefinition: BadgeDefinition
): void {
  let id = address
    .concat("-")
    .concat(block.number.toString())
    .concat("-")
    .concat(badgeDefinition.name);
  let badge = new BadgeAward(id);

  let badgeCount = badgeDefinition.badgeCount + 1;
  badgeDefinition.badgeCount = badgeCount;
  badgeDefinition.save();

  badge.name = badgeDefinition.name;
  badge.awardedAtBlock = block.number;
  badge.awardedAtTimestamp = block.timestamp;
  badge.badgeNumber = badgeCount;
  badge.save();
}
