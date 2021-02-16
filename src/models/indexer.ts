import { 
  Address,
  BigInt,
  BigDecimal,
} from "@graphprotocol/graph-ts"

import {
  Indexer as IndexerEntity,
  IndexerUpdate as IndexerUpdateEntity,
} from "../../generated/schema"

import {
  StakeDeposited,
  StakeWithdrawn,
  StakeSlashed,
  DelegationParametersUpdated,
} from '../../generated/Staking/Staking'

import { tokenAmountToDecimal } from '../helpers/token'
import { feeCutToDecimalRatio } from '../helpers/feeCut'
import { DECIMAL_ZERO, INT_ZERO } from '../helpers/constants'

// A class to manage Indexer
export class Indexer {
  indexerEntity: IndexerEntity

  // Initialize an Indexer using its address
  constructor(address: Address) {
    let indexerEntity = IndexerEntity.load(address.toHex())
    if(indexerEntity == null) {
      indexerEntity = new IndexerEntity(address.toHex())
      indexerEntity.ownStake = DECIMAL_ZERO
    }
    this.indexerEntity = indexerEntity as IndexerEntity
  }

  // Handles a stake deposit
  handleStakeDeposited(event: StakeDeposited): void {
    // Update the creation time when it is the first stake
    if(this.indexerEntity.ownStake.equals(DECIMAL_ZERO)) {
      this.indexerEntity.createdAtTimestamp = event.block.timestamp
    }

    // Update the deposit
    let indexerStakeDeposited = tokenAmountToDecimal(event.params.tokens)
    this.indexerEntity.ownStake = this.indexerEntity.ownStake.plus(indexerStakeDeposited)
    this.indexerEntity.save()
  }

  // Handles a stake withdrawl
  handleStakeWithdrawn(event: StakeWithdrawn): void {
    let indexerStakeWithdrawn = tokenAmountToDecimal(event.params.tokens)
    this.indexerEntity.ownStake = this.indexerEntity.ownStake.minus(indexerStakeWithdrawn)
    this.indexerEntity.save()
  }

  // Handles a stake slashing
  handleStakeSlashed(event: StakeSlashed): void {
    let indexerStakeSlashed = tokenAmountToDecimal(event.params.tokens)
    this.indexerEntity.ownStake = this.indexerEntity.ownStake.minus(indexerStakeSlashed)
    this.indexerEntity.save()
  }

  // Handle a change in Indexer delegation parameters
  handleDelegationParametersUpdated(event: DelegationParametersUpdated): void {
    // Store previous values for the update
    let previousIndexingRewardCutRatio = this.indexerEntity.indexingRewardCutRatio
    let previousQueryFeeCutRatio = this.indexerEntity.queryFeeCutRatio
    let newIndexingRewardCutRatio = feeCutToDecimalRatio(event.params.indexingRewardCut)
    let newQueryFeeCutRatio = feeCutToDecimalRatio(event.params.queryFeeCut)

    // Update the query fee ratios
    this.indexerEntity.indexingRewardCutRatio = newIndexingRewardCutRatio
    this.indexerEntity.queryFeeCutRatio = newQueryFeeCutRatio
    
    // Update the cooldown block
    if(event.params.cooldownBlocks.isZero()) {
      this.indexerEntity.delegatorParameterCooldownBlock = null
    } else {
      this.indexerEntity.delegatorParameterCooldownBlock = event.block.number.plus(event.params.cooldownBlocks)
    }

    // Save the entity
    this.indexerEntity.save()

    // Determine if an update was made
    let isUpdated = true
    if((previousIndexingRewardCutRatio != null) && (previousQueryFeeCutRatio != null)) { 
      if(
        newIndexingRewardCutRatio.equals(previousIndexingRewardCutRatio as BigDecimal) &&
        newQueryFeeCutRatio.equals(previousQueryFeeCutRatio as BigDecimal)) {
          isUpdated = false
        }
    }

    // Store the update
    if(isUpdated) {
      let updateId = this.indexerEntity.id.concat('-').concat(event.block.number.toString())
      let indexerUpdateEntity = new IndexerUpdateEntity(updateId)
      indexerUpdateEntity.updatedAtTimestamp = event.block.timestamp
      indexerUpdateEntity.updatedAtBlock = event.block.number
      indexerUpdateEntity.indexer = this.indexerEntity.id
      indexerUpdateEntity.previousIndexingRewardCutRatio = previousIndexingRewardCutRatio
      indexerUpdateEntity.previousQueryFeeCutRatio = previousQueryFeeCutRatio
      indexerUpdateEntity.newIndexingRewardCutRatio = this.indexerEntity.indexingRewardCutRatio
      indexerUpdateEntity.newQueryFeeCutRatio = this.indexerEntity.queryFeeCutRatio
      indexerUpdateEntity.save()
    }

  }

}
