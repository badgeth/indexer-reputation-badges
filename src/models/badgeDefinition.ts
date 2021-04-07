import { ethereum } from "@graphprotocol/graph-ts";
import { BadgeDefinition as BadgeDefinitionEntity } from "../../generated/schema";

// A class to manage Badge Definition
export class BadgeDefinition {
  badgeDefinitionEntity: BadgeDefinitionEntity;
  currentBlock: ethereum.Block;

  // Initialize an Indexer Snapshot
  constructor(index: number, currentBlock: ethereum.Block) {
    let badgeDefinitionEntity = this._initializeBadgeDefinition(
      index,
      currentBlock
    );
    this.badgeDefinitionEntity = badgeDefinitionEntity;
  }

  _initializeBadgeDefinition(
    index: number,
    currentBlock: ethereum.Block
  ): BadgeDefinitionEntity {
    let id = "badge-".concat(index.toString());
    let badgeDefinitionEntity = BadgeDefinitionEntity.load(id);
    if (badgeDefinitionEntity == null) {
      // let badgeOverview = initializeBadgeOverview(currentBlock);
      badgeDefinitionEntity = new BadgeDefinitionEntity(id);
      badgeDefinitionEntity.createdAtTimestamp = currentBlock.timestamp;
      badgeDefinitionEntity.entity = "Indexer";
      badgeDefinitionEntity.property = "isOverDelegated";
      badgeDefinitionEntity.preAwardValue = "false";
      badgeDefinitionEntity.postAwardValue = "true";
      badgeDefinitionEntity.badgeCount = 0;
      badgeDefinitionEntity.save();
    }

    return badgeDefinitionEntity as BadgeDefinitionEntity;
  }
}
