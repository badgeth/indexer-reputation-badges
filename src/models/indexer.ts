import { 
  Address,
  BigInt,
  BigDecimal,
  ethereum,
} from "@graphprotocol/graph-ts"

import {
  Indexer as IndexerEntity,
  IndexerParameterUpdate as IndexerParameterUpdateEntity,
  PoolReward as PoolRewardEntity,
  IndexerSnapshot as IndexerSnapshotEntity,
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
import { DECIMAL_ZERO, DECIMAL_SIXTEEN, INT_ZERO, PROTOCOL_GENESIS, ONE_DAY } from '../helpers/constants'

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
    return this.delegatedStake().div(this.maximumDelegation())
  }

  // Get the snapshot for a specific block
  snapshotAtBlock(block: ethereum.Block): IndexerSnapshotEntity {
    // Define the snapshot ID
    let snapshotDay = block.timestamp.minus(PROTOCOL_GENESIS).div(ONE_DAY)
    let snapshotId = this.indexerEntity.id.concat('-').concat(snapshotDay.toString())

    // Lazy load the snapshot
    let snapshot = IndexerSnapshotEntity.load(snapshotId)
    if(snapshot == null) {
      snapshot = new IndexerSnapshotEntity(snapshotId)
      snapshot.indexer = this.indexerEntity.id
      snapshot.startsAtTimestamp = PROTOCOL_GENESIS.plus(snapshotDay.times(ONE_DAY))
      snapshot.ownStakeInitial = this.ownStake()
      snapshot.delegatedStakeInitial = this.delegatedStake()
      snapshot.ownStakeDelta = DECIMAL_ZERO
      snapshot.delegatedStakeDelta = DECIMAL_ZERO
      snapshot.delegationRewards = DECIMAL_ZERO
    }
    return snapshot as IndexerSnapshotEntity
  }

  // Update the indexer own stake
  updateOwnStake(ownStakeDelta: BigDecimal, block:ethereum.Block): void {
    // Add the difference in the snapshot
    let snapshot = this.snapshotAtBlock(block)
    snapshot.ownStakeDelta = snapshot.ownStakeDelta.plus(ownStakeDelta)
    snapshot.save()

    // Update the own stake and other parameters
    this.indexerEntity.ownStake = this.ownStake().plus(ownStakeDelta)
    this.indexerEntity.maximumDelegation = this.maximumDelegation()
    this.indexerEntity.isOverDelegated = this.isOverDelegated()
    this.indexerEntity.allocationRatio = this.allocationRatio()
    this.indexerEntity.delegationRatio = this.delegationRatio()
    this.indexerEntity.save()
  }

  // Update the indexer delegated stake
  updateDelegatedStake(delegatedStakeDelta: BigDecimal, delegationPoolSharesDelta: BigInt, block:ethereum.Block): void {
    // Add the difference in the snapshot
    let snapshot = this.snapshotAtBlock(block)
    snapshot.delegatedStakeDelta = snapshot.delegatedStakeDelta.plus(delegatedStakeDelta)
    snapshot.save()

    // Update the delegation and other parameters
    this.indexerEntity.delegatedStake = this.delegatedStake().plus(delegatedStakeDelta)
    this.indexerEntity.delegationPoolShares = this.delegationPoolShares().plus(delegationPoolSharesDelta)
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

  // Create a pool reward
  savePoolReward(block: ethereum.Block, amount: BigDecimal, type: string): void {
    if(amount.gt(DECIMAL_ZERO)) {
      // Add the reward in the snapshot
      let snapshot = this.snapshotAtBlock(block)
      snapshot.delegationRewards = snapshot.delegationRewards.plus(amount)
      snapshot.save()

      // Save the Pool Reward
      let rewardId = this.indexerEntity.id
        .concat('-')
        .concat(type)
        .concat('-')
        .concat(block.number.toString())
      let poolReward = new PoolRewardEntity(rewardId)
      poolReward.indexer = this.indexerEntity.id
      poolReward.createdAtBlock = block.number
      poolReward.createdAtTimestamp = block.timestamp
      poolReward.amount = amount
      poolReward.shareRatio = amount.div(this.delegationPoolShares().toBigDecimal())
      poolReward.pooledTokenRatio = amount.div(this.delegatedStake())
      poolReward.type = type
      poolReward.save()
    }
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
    this.updateOwnStake(indexerStakeDeposited, event.block)
  }

  // Handles a stake locked (=unstaked)
  handleStakeLocked(event: StakeLocked): void {
    let indexerStakeLocked = tokenAmountToDecimal(event.params.tokens)
    this.updateOwnStake(indexerStakeLocked.neg(), event.block)
  }

  // Handles a stake withdrawl
  // NOTE: Does nothing since withdrawn balances are not tracked
  handleStakeWithdrawn(event: StakeWithdrawn): void {}

  // Handles a stake slashing
  handleStakeSlashed(event: StakeSlashed): void {
    let indexerStakeSlashed = tokenAmountToDecimal(event.params.tokens)
    this.updateOwnStake(indexerStakeSlashed.neg(), event.block)
  }

  // Handles a stake delegation
  handleStakeDelegated(event: StakeDelegated): void {
    let indexerStakeDelegated = tokenAmountToDecimal(event.params.tokens)
    let mintedShares = event.params.shares
    this.updateDelegatedStake(
      indexerStakeDelegated,
      mintedShares,
      event.block
    )
  }

  // Handles a delegated stake lock
  handleStakeDelegatedLocked(event: StakeDelegatedLocked): void {
    let burnedShares = event.params.shares
    let indexerStakeDelegatedLocked = tokenAmountToDecimal(event.params.tokens)
    this.updateDelegatedStake(
      indexerStakeDelegatedLocked.neg(),
      burnedShares.neg(),
      event.block
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

    // Update the delegated since they are compounded
    this.updateDelegatedStake(
      delegatorIndexingRewards,
      INT_ZERO,
      event.block
    )

    // Save the reward entity
    this.savePoolReward(event.block, delegatorIndexingRewards, 'IndexingReward')
  }

  // Handles a rebate claim (=Query Fees)
  // NOTE: If the Indexer part is re-staked, it is handled in the StakeDeposit event
  handleRebateClaimed(event: RebateClaimed): void {
    // Increase the delegated tokens as they are automatically compounded
    let delegationFees = tokenAmountToDecimal(event.params.delegationFees)
    this.updateDelegatedStake(
      delegationFees,
      INT_ZERO,
      event.block
    )

    // Save the reward entity
    this.savePoolReward(event.block, delegationFees, 'QueryFee')
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
      let indexerParameterUpdateEntity = new IndexerParameterUpdateEntity(updateId)
      indexerParameterUpdateEntity.updatedAtTimestamp = event.block.timestamp
      indexerParameterUpdateEntity.updatedAtBlock = event.block.number
      indexerParameterUpdateEntity.indexer = this.indexerEntity.id
      indexerParameterUpdateEntity.previousIndexingRewardCutRatio = previousIndexingRewardCutRatio
      indexerParameterUpdateEntity.previousQueryFeeCutRatio = previousQueryFeeCutRatio
      indexerParameterUpdateEntity.newIndexingRewardCutRatio = newIndexingRewardCutRatio
      indexerParameterUpdateEntity.newQueryFeeCutRatio = newQueryFeeCutRatio
      indexerParameterUpdateEntity.save()
    }
  }

}
