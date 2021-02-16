import { 
  Address,
  BigDecimal,
  BigInt,
} from "@graphprotocol/graph-ts"

import {
  Indexer as IndexerEntity,
} from "../../generated/schema"

import {
  StakeDeposited,
  StakeWithdrawn,
  StakeSlashed,
  DelegationParametersUpdated,
} from '../../generated/Staking/Staking'

import { TokenStake } from './tokenStake'

let FEE_CUT_DIVIDER = BigDecimal.fromString('1000000')

// A class to manage Indexer
export class Indexer {
  indexerEntity: IndexerEntity

  // Initialize an Indexer using its address
  constructor(address: Address) {
    let indexerEntity = IndexerEntity.load(address.toHex())
    if(indexerEntity == null) {
      indexerEntity = new IndexerEntity(address.toHex())
      indexerEntity.ownStake = new BigDecimal(BigInt.fromI32(0))
    }
    this.indexerEntity = indexerEntity as IndexerEntity
  }

  // Handles a stake deposit
  handleStakeDeposited(event: StakeDeposited): void {
    // Update the creation time when it is the first stake
    if(this.indexerEntity.ownStake.equals(new BigDecimal(BigInt.fromI32(0)))) {
      this.indexerEntity.createdAt = event.block.timestamp
    }

    // Update the deposit
    let indexerStakeDeposited = TokenStake.fromRawTokens(event.params.tokens)
    this.indexerEntity.ownStake = this.indexerEntity.ownStake.plus(indexerStakeDeposited.toBigDecimal())
    this.indexerEntity.save()
  }

  // Handles a stake withdrawl
  handleStakeWithdrawn(event: StakeWithdrawn): void {
    let indexerStakeWithdrawn = TokenStake.fromRawTokens(event.params.tokens)
    this.indexerEntity.ownStake = this.indexerEntity.ownStake.minus(indexerStakeWithdrawn.toBigDecimal())
    this.indexerEntity.save()
  }

  // Handles a stake slashing
  handleStakeSlashed(event: StakeSlashed): void {
    let indexerStakeSlashed = TokenStake.fromRawTokens(event.params.tokens)
    this.indexerEntity.ownStake = this.indexerEntity.ownStake.minus(indexerStakeSlashed.toBigDecimal())
    this.indexerEntity.save()
  }

  // Handle a change in Indexer delegation parameters
  handleDelegationParametersUpdated(event: DelegationParametersUpdated): void {
    // Update the query fee ratios
    this.indexerEntity.indexingRewardCutRatio = new BigDecimal(event.params.indexingRewardCut).div(FEE_CUT_DIVIDER)
    this.indexerEntity.queryFeeCutRatio = new BigDecimal(event.params.queryFeeCut).div(FEE_CUT_DIVIDER)
    
    // Update the cooldown block
    if(event.params.cooldownBlocks.isZero()) {
      this.indexerEntity.delegatorParameterCooldownBlock = BigInt.fromI32(0)
    } else {
      this.indexerEntity.delegatorParameterCooldownBlock = event.block.number.plus(event.params.cooldownBlocks)
    }

    // Save the entity
    this.indexerEntity.save()
  }

}
