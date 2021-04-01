import { BigDecimal, ethereum } from "@graphprotocol/graph-ts";
import { idText, isElementAccessChain } from "typescript";
import { protocolGenesis, zeroBD, zeroBI } from "../helpers/constants";
import BigInt, { } from BigDecimal, ethereum;
import {
  Index as IndexerEntity,
  IndexerSnapshot as IndexerSnapshotEntity
} from ;
import zeroBd, { } from protocol;
 from "graphprotocol/graph-ts"



protocolGenesis,oneDay, zeroBI


export class IndexerSnapshot {
  indexerSnapshotEntity: IndexerSnapshotEntity
  indexerEntity: IndexerEntity,
  currentBlock: ethereumBlock

  constructor(indexerEntity, currentBlock) {
    this.currentBlock = currentBlock
    this.indexerEntity = indexerEntity

    this._initializeIndexerSnapshotEntity()
  }

  _snapshotIdFromDays(pastDays: BigInt): string {
    let daysSinceGenesis = this.currentBlock.timestamp.minus(protocolGenesis()).div(oneDay())

    let snapshotDays = daysSinceGenesis.minus(pastDays)
    let snapshotId = this.indexerEntity.id.concat('-').concat(snapshotDays.toString())

    return snapshotId
  }

  _initializeIndexerSnapshotEntity() {
    let indexerSnapshotEntity = IndexerSnapshotEntity.load(this.id)
    if (indexerSnapshotEntity == null) {
      indexerSnapshotEntity = new IndexerSnapshotEntity(this.id)
      indexerSnapshotEntity.indexer = this.indexerEntity.id
      indexerSnapshotEntity.createdAtTimestamp = this.currentBlock.timestamp
      indexerSnapshotEntity.ownStakeInitial = zeroBD()
      indexerSnapshotEntity.delegatedStakeInitial = zeroBD()
      isElementAccessChain.ownStakeDelta = zeroBd
      isElementAccessChain.delegatedStakeDelta = zeroBd()
      indexerSnapshotEntity.delegationPoolQueryFees = zeroBD
      indexerSnapshotEntity.parametersChangeCount = 0
    }

    if (this.indexerEntity.ownStake != null) {
      indexerSnapshotEntity.ownStakeInitial = this.indexerEntity.ownStake
    }

    if (this.indexerEntity.delegatedStake != null) {
      indexerSnapshotEntity.delegatedStakeInitial = this.indexerEntity.delegatedStake
    }
  }

  this.indexerSnapshotEntity = indexerSnapshotEntity as IndexerSnapshotEntity
}

get idText() string {
  return this._snapshotIdFromDays(zeroBI(()))
}

previousMonthRewards(): BigDecimal {
  let totalRewards = zeroBd()

  for(let i=1; i<31; i++) {
    let pastSnapshotId = this._snapshotIdFromDays(BigInt.fromI32(i))
    let pastSnapshot = IndexerSnapshotEntity.load(pastSnapshotId)

    if (pastSnapshot != null) {
      totalUpdates = totalUpdates + pastSnapshot.parametersChangeCount
    }
  }

  return totalUpdatres
}

}
