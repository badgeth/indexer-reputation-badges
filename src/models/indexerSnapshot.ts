import { 
  BigInt,
  BigDecimal,
  ethereum,
} from "@graphprotocol/graph-ts"
  
import {
  Indexer as IndexerEntity,
  IndexerSnapshot as IndexerSnapshotEntity,
} from "../../generated/schema"

import { 
  DECIMAL_ZERO,
  PROTOCOL_GENESIS,
  ONE_DAY,
} from '../helpers/constants'

// Function to generate a snapshot ID
function buildSnapshotId(indexerEntity: IndexerEntity, timestamp: BigInt): string {
  let snapshotDay = timestamp.minus(PROTOCOL_GENESIS).div(ONE_DAY)
  let snapshotId = indexerEntity.id.concat('-').concat(snapshotDay.toString())
  return snapshotId
}

// A class to manage Indexer Snapshot
export class IndexerSnapshot {
    indexerSnapshotEntity: IndexerSnapshotEntity
    indexerEntity: IndexerEntity
    currentBlock: ethereum.Block

  // Initialize an Indexer Snapshot
  constructor(indexerEntity: IndexerEntity, currentBlock: ethereum.Block) {
    this.currentBlock = currentBlock
    this.indexerEntity = indexerEntity

    // Lazy load the snapshot
    let snapshotId = buildSnapshotId(this.indexerEntity, this.currentBlock.timestamp)
    let indexerSnapshotEntity = IndexerSnapshotEntity.load(snapshotId)
    if(indexerSnapshotEntity == null) {
      // Basic Initialization
      indexerSnapshotEntity = new IndexerSnapshotEntity(snapshotId)
      indexerSnapshotEntity.indexer = this.indexerEntity.id
      indexerSnapshotEntity.createdAtTimestamp = currentBlock.timestamp
      indexerSnapshotEntity.ownStakeInitial = this.indexerEntity.ownStake as BigDecimal
      indexerSnapshotEntity.delegatedStakeInitial = this.indexerEntity.delegatedStake as BigDecimal
      indexerSnapshotEntity.ownStakeDelta = DECIMAL_ZERO
      indexerSnapshotEntity.delegatedStakeDelta = DECIMAL_ZERO
      indexerSnapshotEntity.delegationRewards = DECIMAL_ZERO
      indexerSnapshotEntity.parametersChangeCount = 0
      indexerSnapshotEntity.previousDelegationRewardsDay = DECIMAL_ZERO
      indexerSnapshotEntity.previousDelegationRewardsWeek = DECIMAL_ZERO
      indexerSnapshotEntity.previousDelegationRewardsMonth = DECIMAL_ZERO

      // Determine the previous day rewards
      for(let i=1; i<31; i++) {
        // Deterime the ID of the snapshot
        let pastSnapshotId = buildSnapshotId(this.indexerEntity, currentBlock.timestamp.minus(BigInt.fromI32(i).times(ONE_DAY)))
        let pastSnapshot = IndexerSnapshotEntity.load(pastSnapshotId)
        
        // If a snapshot is found, update previous counters
        if(pastSnapshot != null) {
          let pastSnapshotDelegationRewards = pastSnapshot.delegationRewards
          if(i == 1) {
            this.indexerSnapshotEntity.previousDelegationRewardsDay = indexerSnapshotEntity.previousDelegationRewardsDay.plus(pastSnapshotDelegationRewards)
          }
          if(i < 8) {
            this.indexerSnapshotEntity.previousDelegationRewardsWeek = indexerSnapshotEntity.previousDelegationRewardsWeek.plus(pastSnapshotDelegationRewards)
          }
          this.indexerSnapshotEntity.previousDelegationRewardsMonth = indexerSnapshotEntity.previousDelegationRewardsMonth.plus(pastSnapshotDelegationRewards)
        }
      }

      this.indexerSnapshotEntity = indexerSnapshotEntity as IndexerSnapshotEntity
    }
  }

  //--- GETTERS ---//
  id(): string {
    return this.indexerSnapshotEntity.id
  }

  previousDelegationRewardsMonth(): BigDecimal {
    return this.indexerSnapshotEntity.previousDelegationRewardsMonth as BigDecimal
  }

  //-- SETTERS --//
  updateOwnStake(ownStakeDelta: BigDecimal): void {
    this.indexerSnapshotEntity.ownStakeDelta = this.indexerSnapshotEntity.ownStakeDelta.plus(ownStakeDelta)
    this.indexerSnapshotEntity.save()
  }

  updateDelegatedStake(delegatedStakeDelta: BigDecimal): void {
    this.indexerSnapshotEntity.delegatedStakeDelta = this.indexerSnapshotEntity.delegatedStakeDelta.plus(delegatedStakeDelta)
    this.indexerSnapshotEntity.save()
  }

  addDelegationPoolRewards(amount: BigDecimal): void {
    this.indexerSnapshotEntity.delegationRewards = this.indexerSnapshotEntity.delegationRewards.plus(amount)
    this.indexerSnapshotEntity.save()
  }

  incrementParametersChangesCount(): void {
    this.indexerSnapshotEntity.parametersChangeCount++
    this.indexerSnapshotEntity.save()
  }
}