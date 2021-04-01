import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  Indexer as IndexerEntity,
  IndexerSnapshot as IndexerSnapshotEntity,
} from "../../generated/schema";
import { oneDay, protocolGenesis, zeroBD, zeroBI } from "../helpers/constants";

// A class to manage Indexer Snapshot
export class IndexerSnapshot {
  indexerSnapshotEntity: IndexerSnapshotEntity;
  indexerEntity: IndexerEntity;
  currentBlock: ethereum.Block;

  // Initialize an Indexer Snapshot
  constructor(indexerEntity: IndexerEntity, currentBlock: ethereum.Block) {
    this.currentBlock = currentBlock;
    this.indexerEntity = indexerEntity;
    this._initializeIndexerSnapshotEntity();
  }

  //--- INTERNAL ---//
  _snapshotIdFromDays(pastDays: BigInt): string {
    let daysSinceGenesis = this.currentBlock.timestamp
      .minus(protocolGenesis())
      .div(oneDay());
    let snapshotDays = daysSinceGenesis.minus(pastDays);
    let snapshotId = this.indexerEntity.id
      .concat("-")
      .concat(snapshotDays.toString());
    return snapshotId;
  }

  _initializeIndexerSnapshotEntity(): void {
    // Lazy load the snapshot
    let indexerSnapshotEntity = IndexerSnapshotEntity.load(this.id);
    if (indexerSnapshotEntity == null) {
      // Basic Initialization
      indexerSnapshotEntity = new IndexerSnapshotEntity(this.id);
      indexerSnapshotEntity.indexer = this.indexerEntity.id;
      indexerSnapshotEntity.createdAtTimestamp = this.currentBlock.timestamp;
      indexerSnapshotEntity.ownStakeInitial = zeroBD();
      indexerSnapshotEntity.delegatedStakeInitial = zeroBD();
      indexerSnapshotEntity.ownStakeDelta = zeroBD();
      indexerSnapshotEntity.delegatedStakeDelta = zeroBD();
      indexerSnapshotEntity.delegationPoolIndexingRewards = zeroBD();
      indexerSnapshotEntity.delegationPoolQueryFees = zeroBD();
      indexerSnapshotEntity.parametersChangeCount = 0;

      if (this.indexerEntity.ownStake != null) {
        indexerSnapshotEntity.ownStakeInitial = this.indexerEntity
          .ownStake as BigDecimal;
      }

      if (this.indexerEntity.delegatedStake != null) {
        indexerSnapshotEntity.delegatedStakeInitial = this.indexerEntity
          .delegatedStake as BigDecimal;
      }
    }

    this.indexerSnapshotEntity = indexerSnapshotEntity as IndexerSnapshotEntity;
  }

  //--- GETTERS ---//
  get id(): string {
    return this._snapshotIdFromDays(zeroBI());
  }

  previousMonthRewards(): BigDecimal {
    let totalRewards = zeroBD();

    // Determine the previous day rewards
    for (let i = 1; i < 31; i++) {
      // Deterime the ID of the snapshot
      let pastSnapshotId = this._snapshotIdFromDays(BigInt.fromI32(i));
      let pastSnapshot = IndexerSnapshotEntity.load(pastSnapshotId);

      // If a snapshot is found, update previous counters
      if (pastSnapshot != null) {
        totalRewards = totalRewards.plus(
          pastSnapshot.delegationPoolIndexingRewards
        );
        totalRewards = totalRewards.plus(pastSnapshot.delegationPoolQueryFees);
      }
    }

    return totalRewards;
  }

  previousMonthParametersUpdateCount(): i32 {
    let totalUpdates = 0;
    // Determine the previous day changes
    for (let i = 1; i < 31; i++) {
      // Deterime the ID of the snapshot
      let pastSnapshotId = this._snapshotIdFromDays(BigInt.fromI32(i));
      let pastSnapshot = IndexerSnapshotEntity.load(pastSnapshotId);

      // If a snapshot is found, update previous counters
      if (pastSnapshot != null) {
        totalUpdates = totalUpdates + pastSnapshot.parametersChangeCount;
      }
    }

    return totalUpdates;
  }

  //-- SETTERS --//
  updateOwnStake(ownStakeDelta: BigDecimal): void {
    this.indexerSnapshotEntity.ownStakeDelta = this.indexerSnapshotEntity.ownStakeDelta.plus(
      ownStakeDelta
    );
    this.indexerSnapshotEntity.save();
  }

  updateDelegatedStake(delegatedStakeDelta: BigDecimal): void {
    this.indexerSnapshotEntity.delegatedStakeDelta = this.indexerSnapshotEntity.delegatedStakeDelta.plus(
      delegatedStakeDelta
    );
    this.indexerSnapshotEntity.save();
  }

  addDelegationPoolIndexingRewards(amount: BigDecimal): void {
    this.indexerSnapshotEntity.delegationPoolIndexingRewards = this.indexerSnapshotEntity.delegationPoolIndexingRewards.plus(
      amount
    );
    this.indexerSnapshotEntity.save();
  }

  addDelegationPoolQueryFees(amount: BigDecimal): void {
    this.indexerSnapshotEntity.delegationPoolQueryFees = this.indexerSnapshotEntity.delegationPoolQueryFees.plus(
      amount
    );
    this.indexerSnapshotEntity.save();
  }

  incrementParametersChangesCount(): void {
    this.indexerSnapshotEntity.parametersChangeCount =
      this.indexerSnapshotEntity.parametersChangeCount + 1;
    this.indexerSnapshotEntity.save();
  }
}
