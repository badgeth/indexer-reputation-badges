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
    this.indexerEntity.indexingRewardCut = new BigDecimal(event.params.indexingRewardCut)
    this.indexerEntity.queryFeeCut = new BigDecimal(event.params.queryFeeCut)
    this.indexerEntity.delegatorParameterCooldownBlock = event.block.number.plus(event.params.cooldownBlocks)
    this.indexerEntity.save()
  }

}
