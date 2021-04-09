import { log } from "@graphprotocol/graph-ts";
import { BadgeDefinitionCreated } from "../../generated/BadgeDefinitions/BadgeDefinition";
import { BadgeDefinition } from "../../generated/schema";

/**
 * @dev Emitted when `indexer` update the delegation parameters for its delegation pool.
 * Parameters:
 *   address indexer
 *   uint32 indexingRewardCut
 *   uint32 queryFeeCut
 *   uint32 cooldownBlocks
 */
export function handleBadgeDefinitionCreated(
  event: BadgeDefinitionCreated
): void {
  let badgeDefinition = new BadgeDefinition(event.params.badgeName);
  badgeDefinition.name = event.params.badgeName;
  badgeDefinition.preAwardValue = "false";
  badgeDefinition.postAwardValue = "true";
  badgeDefinition.createdAtTimestamp = event.block.timestamp;
  badgeDefinition.entity = "Indexer";
  badgeDefinition.property = "isOverDelegated";
  badgeDefinition.badgeCount = 0;

  badgeDefinition.save();

  log.info("WEEEE", {});
  // let indexer = new Indexer(event.params.indexer, event.block);
  // indexer.handleDelegationParametersUpdated(event);
}
