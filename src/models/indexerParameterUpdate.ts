import { BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import {
  Indexer as IndexerEntity,
  IndexerParameterUpdate as IndexerParameterUpdateEntity,
} from "../../generated/schema";

// A class to manage Indexer
export class IndexerParameterUpdate {
  indexerParameterUpdateEntity: IndexerParameterUpdateEntity;
  indexerEntity: IndexerEntity;
  currentBlock: ethereum.Block;

  // Initialize an Indexer Snapshot
  constructor(indexerEntity: IndexerEntity, currentBlock: ethereum.Block) {
    this.currentBlock = currentBlock;
    this.indexerEntity = indexerEntity;
    let updateId = this.indexerEntity.id
      .concat("-")
      .concat(currentBlock.number.toString());
    this.indexerParameterUpdateEntity = new IndexerParameterUpdateEntity(
      updateId
    );
    this.indexerParameterUpdateEntity.updatedAtTimestamp =
      currentBlock.timestamp;
    this.indexerParameterUpdateEntity.updatedAtBlock = currentBlock.number;
    this.indexerParameterUpdateEntity.indexer = this.indexerEntity.id;
    this.indexerParameterUpdateEntity.previousIndexingRewardCutRatio = this.indexerEntity.indexingRewardCutRatio;
    this.indexerParameterUpdateEntity.previousQueryFeeCutRatio = this.indexerEntity.queryFeeCutRatio;
  }

  registerUpdate(
    newIndexingRewardCutRatio: BigDecimal,
    newQueryFeeCutRatio: BigDecimal
  ): void {
    let updated = true;
    // Don't store the update for the very first one
    updated =
      updated &&
      !(
        this.indexerParameterUpdateEntity.previousIndexingRewardCutRatio ==
          null &&
        this.indexerParameterUpdateEntity.previousQueryFeeCutRatio == null
      );

    // Don't store the update if there is no change
    updated =
      updated &&
      (this.indexerParameterUpdateEntity.previousIndexingRewardCutRatio.notEqual(
        newIndexingRewardCutRatio
      ) ||
        this.indexerParameterUpdateEntity.previousQueryFeeCutRatio.notEqual(
          newQueryFeeCutRatio
        ));

    // Store the update
    if (updated) {
      this.indexerParameterUpdateEntity.newIndexingRewardCutRatio = newIndexingRewardCutRatio;
      this.indexerParameterUpdateEntity.newQueryFeeCutRatio = newQueryFeeCutRatio;
      this.indexerParameterUpdateEntity.save();
    }
  }
}
