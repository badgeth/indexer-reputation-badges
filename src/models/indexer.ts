import { 
  Address,
  BigInt,
  BigDecimal,
  ethereum,
} from "@graphprotocol/graph-ts"

import {
  Indexer as IndexerEntity,
} from "../../generated/schema"

import { IndexerSnapshot } from "./indexerSnapshot"
import { IndexerParameterUpdate } from "./indexerParameterUpdate"

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
import { 
  DECIMAL_ZERO,
  DECIMAL_SIXTEEN,
  INT_ZERO,
} from '../helpers/constants'

// A class to manage Indexer
export class Indexer {
  indexerEntity: IndexerEntity
  currentBlock: ethereum.Block
  currentSnapshot: IndexerSnapshot

  // Initialize an Indexer using its address
  constructor(address: Address, currentBlock: ethereum.Block) {
    let indexerEntity = IndexerEntity.load(address.toHex())
    if(indexerEntity == null) {
      indexerEntity = new IndexerEntity(address.toHex())
      indexerEntity.createdAtTimestamp = currentBlock.timestamp
      indexerEntity.ownStake = DECIMAL_ZERO
      indexerEntity.delegatedStake = DECIMAL_ZERO
      indexerEntity.allocatedStake = DECIMAL_ZERO
      indexerEntity.maximumDelegation = DECIMAL_ZERO
      indexerEntity.allocationRatio = DECIMAL_ZERO
      indexerEntity.delegationRatio = DECIMAL_ZERO
      indexerEntity.isOverDelegated = false
      indexerEntity.delegationPoolShares = INT_ZERO
      indexerEntity.monthlyDelegatorRewardRate = DECIMAL_ZERO
    }
    this.indexerEntity = indexerEntity as IndexerEntity
    this.currentBlock = currentBlock
    this.currentSnapshot = new IndexerSnapshot(this.indexerEntity, this.currentBlock)
  }

  //=============== Getters and Setters ===============//
  // Indexer ID
  id(): string {
    return this.indexerEntity.id
  }

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
    return this.delegatedStake().div(this.maximumDelegation())
  }

  // Determine the monthly reward rate for delegator
  monthlyDelegatorRewardRate(): BigDecimal {
    if(this.delegatedStake().equals(DECIMAL_ZERO)) {
      return DECIMAL_ZERO
    }
    return this.currentSnapshot.previousDelegationRewardsMonth().div(this.delegatedStake())
  }

  // Update the indexer own stake
  updateOwnStake(ownStakeDelta: BigDecimal): void {
    // Add the difference in the snapshot
    this.currentSnapshot.updateOwnStake(ownStakeDelta)
    this.indexerEntity.lastSnapshot = this.currentSnapshot.id()

    // Update the own stake and other parameters
    this.indexerEntity.ownStake = this.ownStake().plus(ownStakeDelta)
    this.indexerEntity.maximumDelegation = this.maximumDelegation()
    this.indexerEntity.isOverDelegated = this.isOverDelegated()
    this.indexerEntity.allocationRatio = this.allocationRatio()
    this.indexerEntity.delegationRatio = this.delegationRatio()
    this.indexerEntity.save()
  }

  // Update the indexer delegated stake
  updateDelegatedStake(delegatedStakeDelta: BigDecimal, delegationPoolSharesDelta: BigInt): void {
    // Add the difference in the snapshot
    this.currentSnapshot.updateDelegatedStake(delegatedStakeDelta)
    this.indexerEntity.lastSnapshot = this.currentSnapshot.id()

    // Update the delegation and other parameters
    this.indexerEntity.delegatedStake = this.delegatedStake().plus(delegatedStakeDelta)
    this.indexerEntity.delegationPoolShares = this.delegationPoolShares().plus(delegationPoolSharesDelta)
    this.indexerEntity.isOverDelegated = this.isOverDelegated()
    this.indexerEntity.allocationRatio = this.allocationRatio()
    this.indexerEntity.delegationRatio = this.delegationRatio()
    this.indexerEntity.monthlyDelegatorRewardRate = this.monthlyDelegatorRewardRate()
    this.indexerEntity.save()
  }

  // Update the indexer delegated stake
  updateAllocatedStake(newAllocatedStake: BigDecimal): void {
    this.indexerEntity.allocatedStake = newAllocatedStake
    this.indexerEntity.allocationRatio = this.allocationRatio()
    this.indexerEntity.save()
  }

  // Create a pool reward
  addDelegationPoolRewards(amount: BigDecimal): void {
    if(amount.gt(DECIMAL_ZERO)) {
      // Add the reward in the snapshot
      this.currentSnapshot.addDelegationPoolRewards(amount)
    }
  }

  //=============== Event Handlers ===============//
  // Handles a stake deposit
  handleStakeDeposited(event: StakeDeposited): void {
    // Update the deposit
    let indexerStakeDeposited = tokenAmountToDecimal(event.params.tokens)
    this.updateOwnStake(indexerStakeDeposited)
  }

  // Handles a stake locked (=unstaked)
  handleStakeLocked(event: StakeLocked): void {
    let indexerStakeLocked = tokenAmountToDecimal(event.params.tokens)
    this.updateOwnStake(indexerStakeLocked.neg())
  }

  // Handles a stake withdrawl
  // NOTE: Does nothing since withdrawn balances are not tracked
  handleStakeWithdrawn(event: StakeWithdrawn): void {}

  // Handles a stake slashing
  handleStakeSlashed(event: StakeSlashed): void {
    let indexerStakeSlashed = tokenAmountToDecimal(event.params.tokens)
    this.updateOwnStake(indexerStakeSlashed.neg())
  }

  // Handles a stake delegation
  handleStakeDelegated(event: StakeDelegated): void {
    let indexerStakeDelegated = tokenAmountToDecimal(event.params.tokens)
    let mintedShares = event.params.shares
    this.updateDelegatedStake(
      indexerStakeDelegated,
      mintedShares
    )
  }

  // Handles a delegated stake lock
  handleStakeDelegatedLocked(event: StakeDelegatedLocked): void {
    let burnedShares = event.params.shares
    let indexerStakeDelegatedLocked = tokenAmountToDecimal(event.params.tokens)
    this.updateDelegatedStake(
      indexerStakeDelegatedLocked.neg(),
      burnedShares.neg()
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
  // NOTE: Indexer rewards is not automatically restaked
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
    // Save the reward entity
    this.addDelegationPoolRewards(delegatorIndexingRewards)

    // Update the delegated since they are compounded
    this.updateDelegatedStake(
      delegatorIndexingRewards,
      INT_ZERO
    )


  }

  // Handles a rebate claim (=Query Fees)
  // NOTE: If the Indexer part is re-staked, it is handled in the StakeDeposit event
  handleRebateClaimed(event: RebateClaimed): void {
    // Increase the delegated tokens as they are automatically compounded
    let delegationFees = tokenAmountToDecimal(event.params.delegationFees)
    this.updateDelegatedStake(
      delegationFees,
      INT_ZERO
    )

    // Save the reward entity
    this.addDelegationPoolRewards(delegationFees)
  }

  // Handle a change in Indexer delegation parameters
  handleDelegationParametersUpdated(event: DelegationParametersUpdated): void {
    // Get the new values for the update
    let newIndexingRewardCutRatio = feeCutToDecimalRatio(event.params.indexingRewardCut)
    let newQueryFeeCutRatio = feeCutToDecimalRatio(event.params.queryFeeCut)
    let indexerParameterUpdate = new IndexerParameterUpdate(this.indexerEntity, this.currentBlock)

    // Update the query fee ratios
    this.indexerEntity.indexingRewardCutRatio = newIndexingRewardCutRatio
    this.indexerEntity.queryFeeCutRatio = newQueryFeeCutRatio
    indexerParameterUpdate.registerUpdate(newIndexingRewardCutRatio, newQueryFeeCutRatio)
    
    // Update the cooldown block
    if(event.params.cooldownBlocks.isZero()) {
      this.indexerEntity.delegatorParameterCooldownBlock = null
    } else {
      this.indexerEntity.delegatorParameterCooldownBlock = event.block.number.plus(event.params.cooldownBlocks)
    }

    // Save the indexer entity
    this.indexerEntity.save()
  }

}
