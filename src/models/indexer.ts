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
  StakeLocked,
  StakeWithdrawn,
  StakeSlashed,
  DelegationParametersUpdated,
  StakeDelegated,
  StakeDelegatedLocked,
  StakeDelegatedWithdrawn,
  AllocationCreated,
  AllocationCollected,
  AllocationClosed,
  RebateClaimed,
} from '../../generated/Staking/Staking'

import {
  RewardsAssigned,
} from '../../generated/RewardsManager/RewardsManager'

import { tokenAmountToDecimal } from '../helpers/token'
import { feeCutToDecimalRatio } from '../helpers/feeCut'
import { DECIMAL_ZERO, DECIMAL_SIXTEEN, INT_ZERO } from '../helpers/constants'

// A class to manage Indexer
export class Indexer {
  indexerEntity: IndexerEntity

  // Initialize an Indexer using its address
  constructor(address: Address) {
    let indexerEntity = IndexerEntity.load(address.toHex())
    if(indexerEntity == null) {
      indexerEntity = new IndexerEntity(address.toHex())
      indexerEntity.ownStake = DECIMAL_ZERO
      indexerEntity.delegatedStake = DECIMAL_ZERO
      indexerEntity.allocatedStake = DECIMAL_ZERO
      indexerEntity.maximumDelegation = DECIMAL_ZERO
      indexerEntity.allocationRatio = DECIMAL_ZERO
      indexerEntity.delegationRatio = DECIMAL_ZERO
      indexerEntity.isOverDelegated = false
      indexerEntity.delegationPoolShares = INT_ZERO
    }
    this.indexerEntity = indexerEntity as IndexerEntity
  }

  //=============== Getters and Setters ===============//
  // Indexer own stake
  ownStake(): BigDecimal {
    return this.indexerEntity.ownStake as BigDecimal
  }

  // Indexer delegated stake
  delegatedStake(): BigDecimal {
    return this.indexerEntity.delegatedStake as BigDecimal
  }

  // Shares of the delegation pool
  delegationPoolShares(): BigInt {
    return this.indexerEntity.delegationPoolShares as BigInt
  }

  // Indexer allocated stake
  allocatedStake(): BigDecimal {
    return this.indexerEntity.allocatedStake as BigDecimal
  }

  // Indexer Maximum Delegation
  maximumDelegation(): BigDecimal {
    return this.ownStake().times(DECIMAL_SIXTEEN)
  }

  // Defines if the Indexer is over delegated
  isOverDelegated(): boolean {
    return this.delegatedStake().gt(this.maximumDelegation())
  }

  // Defines the allocation ratio
  allocationRatio(): BigDecimal {
    // Determine allocation capacity
    let allocationCapacity = this.ownStake()
    if(this.isOverDelegated()) {
      allocationCapacity = allocationCapacity.plus(this.maximumDelegation())
    } else {
      allocationCapacity = allocationCapacity.plus(this.delegatedStake())
    }

    // Avoid zero division
    if(allocationCapacity.equals(DECIMAL_ZERO)) {
      return DECIMAL_ZERO
    }

    return this.allocatedStake().div(allocationCapacity)
  }

  // Defines the delegation ratio
  delegationRatio(): BigDecimal {
    if(this.ownStake().equals(DECIMAL_ZERO)) {
      return DECIMAL_ZERO
    }
    return this.allocatedStake().div(this.maximumDelegation())
  }

  // Update the indexer own stake
  updateOwnStake(newOwnStake: BigDecimal): void {
    this.indexerEntity.ownStake = newOwnStake
    this.indexerEntity.maximumDelegation = this.maximumDelegation()
    this.indexerEntity.isOverDelegated = this.isOverDelegated()
    this.indexerEntity.allocationRatio = this.allocationRatio()
    this.indexerEntity.delegationRatio = this.delegationRatio()
    this.indexerEntity.save()
  }

  // Update the indexer delegated stake
  updateDelegatedStake(newDelegatedStake: BigDecimal, newDelegationPoolShares: BigInt): void {
    this.indexerEntity.delegationPoolShares = newDelegationPoolShares
    this.indexerEntity.delegatedStake = newDelegatedStake
    this.indexerEntity.isOverDelegated = this.isOverDelegated()
    this.indexerEntity.allocationRatio = this.allocationRatio()
    this.indexerEntity.delegationRatio = this.delegationRatio()
    this.indexerEntity.save()
  }

  // Update the indexer delegated stake
  updateAllocatedStake(newAllocatedStake: BigDecimal): void {
    this.indexerEntity.allocatedStake = newAllocatedStake
    this.indexerEntity.allocationRatio = this.allocationRatio()
    this.indexerEntity.save()
  }


  //=============== Event Handlers ===============//
  // Handles a stake deposit
  handleStakeDeposited(event: StakeDeposited): void {
    // Update the creation time when it is the first stake
    if(this.indexerEntity.ownStake.equals(DECIMAL_ZERO)) {
      this.indexerEntity.createdAtTimestamp = event.block.timestamp
    }

    // Update the deposit
    let indexerStakeDeposited = tokenAmountToDecimal(event.params.tokens)
    this.updateOwnStake(this.ownStake().plus(indexerStakeDeposited))
  }

  // Handles a stake locked (=unstaked)
  handleStakeLocked(event: StakeLocked): void {
    let indexerStakeLocked = tokenAmountToDecimal(event.params.tokens)
    this.updateOwnStake(this.ownStake().minus(indexerStakeLocked))
  }

  // Handles a stake withdrawl
  // NOTE: Does nothing since withdrawn balances are not tracked
  handleStakeWithdrawn(event: StakeWithdrawn): void {}

  // Handles a stake slashing
  handleStakeSlashed(event: StakeSlashed): void {
    let indexerStakeSlashed = tokenAmountToDecimal(event.params.tokens)
    this.updateOwnStake(this.ownStake().minus(indexerStakeSlashed))
  }

  // Handles a stake delegation
  handleStakeDelegated(event: StakeDelegated): void {
    let indexerStakeDelegated = tokenAmountToDecimal(event.params.tokens)
    let mintedShares = event.params.shares
    this.updateDelegatedStake(
      this.delegatedStake().plus(indexerStakeDelegated),
      this.delegationPoolShares().plus(mintedShares)
    )
  }

  // Handles a delegated stake lock
  handleStakeDelegatedLocked(event: StakeDelegatedLocked): void {
    let burnedShares = event.params.shares
    let indexerStakeDelegatedWithdrawn = tokenAmountToDecimal(event.params.tokens)
    this.updateDelegatedStake(
      this.delegatedStake().minus(indexerStakeDelegatedWithdrawn),
      this.delegationPoolShares().minus(burnedShares)
    )
  }

  // Handles a stake delegation withdrawn
  // NOTE: Does nothing since withdrawn balances are not tracked
  handleStakeDelegatedWithdrawn(event: StakeDelegatedWithdrawn): void {}

  // Handles an allocation creation
  handleAllocationCreated(event: AllocationCreated): void {
    let indexerAllocatedTokens = tokenAmountToDecimal(event.params.tokens)
    this.updateAllocatedStake(this.allocatedStake().plus(indexerAllocatedTokens))
  }

  // Handles an allocation collection
  // NOTE: Does nothing since any fees collected here are added to the rebate pool
  handleAllocationCollected(event: AllocationCollected): void {}

  // Handles an allocation closure
  handleAllocationClosed(event: AllocationClosed): void {
    let indexerAllocationTokens = tokenAmountToDecimal(event.params.tokens)
    this.updateAllocatedStake(this.allocatedStake().minus(indexerAllocationTokens))
  }

  // Handle the assignment of reward
  handleRewardsAssigned(event: RewardsAssigned): void {
    // Determine the rewards
    let rewardedIndexingTokens = tokenAmountToDecimal(event.params.amount)
    let indexerIndexingRewards = DECIMAL_ZERO
    let delegatorIndexingRewards = DECIMAL_ZERO

    // If nothing is delegated, everything is for the Indexer
    if(this.delegatedStake().equals(DECIMAL_ZERO)) {
      indexerIndexingRewards = rewardedIndexingTokens
    } 
    
    // Otherwise it is split as per the cut
    else {
      indexerIndexingRewards = rewardedIndexingTokens.times(this.indexerEntity.indexingRewardCutRatio as BigDecimal)
      delegatorIndexingRewards = rewardedIndexingTokens.minus(indexerIndexingRewards)
    }

    // Update the stakes since they are compounded
    this.updateOwnStake(this.ownStake().plus(indexerIndexingRewards))
    this.updateDelegatedStake(
      this.delegatedStake().plus(delegatorIndexingRewards),
      this.delegationPoolShares()
    )
  }

  // Handles a rebate claim (=Query Fees)
  // NOTE: If the Indexer part is re-staked, it is handled in the StakeDeposit event
  handleRebateClaimed(event: RebateClaimed): void {
    // Increase the delegated tokens as they are automatically compounded
    let delegationFees = tokenAmountToDecimal(event.params.delegationFees)
    this.updateDelegatedStake(
      this.delegatedStake().plus(delegationFees),
      this.delegationPoolShares()
    )
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

    // Save the indexer entity
    this.indexerEntity.save()

    // Determine if an update was really made
    let isUpdated = true
    if((previousIndexingRewardCutRatio != null) && (previousQueryFeeCutRatio != null)) { 
      if(newIndexingRewardCutRatio.equals(previousIndexingRewardCutRatio as BigDecimal) &&
        newQueryFeeCutRatio.equals(previousQueryFeeCutRatio as BigDecimal))
        {
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
      indexerUpdateEntity.newIndexingRewardCutRatio = newIndexingRewardCutRatio
      indexerUpdateEntity.newQueryFeeCutRatio = newQueryFeeCutRatio
      indexerUpdateEntity.save()
    }

  }



}
