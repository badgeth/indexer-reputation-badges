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
import { 
  DECIMAL_ZERO,
  DECIMAL_SIXTEEN,
  INT_ZERO,
  INT_ONE,
  PROTOCOL_GENESIS,
  ONE_DAY,
} from '../helpers/constants'

// A class to manage Indexer
export class Indexer {
  indexerEntity: IndexerEntity
  currentBlock: ethereum.Block

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

  // Get the snapshot for the current block
  snapshot(): IndexerSnapshotEntity {
    // Define the snapshot ID
    let snapshotDay = this.currentBlock.timestamp.minus(PROTOCOL_GENESIS).div(ONE_DAY)
    let snapshotId = this.indexerEntity.id.concat('-').concat(snapshotDay.toString())

    // Lazy load the snapshot
    let snapshot = IndexerSnapshotEntity.load(snapshotId)
    if(snapshot == null) {
      // Basic Initialization
      snapshot = new IndexerSnapshotEntity(snapshotId)
      snapshot.indexer = this.indexerEntity.id
      snapshot.startsAtTimestamp = PROTOCOL_GENESIS.plus(snapshotDay.times(ONE_DAY))
      snapshot.ownStakeInitial = this.ownStake()
      snapshot.delegatedStakeInitial = this.delegatedStake()
      snapshot.ownStakeDelta = DECIMAL_ZERO
      snapshot.delegatedStakeDelta = DECIMAL_ZERO
      snapshot.delegationRewards = DECIMAL_ZERO
      snapshot.parametersChangeCount = 0
      snapshot.previousDelegationRewardsDay = DECIMAL_ZERO
      snapshot.previousDelegationRewardsWeek = DECIMAL_ZERO
      snapshot.previousDelegationRewardsMonth = DECIMAL_ZERO

      // Determine the previous day rewards
      for(let i=1; i<31; i++) {
        // Deterime the ID of the snapshot
        let previousSnapshotId = this.indexerEntity.id.concat('-').concat(snapshotDay.minus(BigInt.fromI32(i)).toString())
        let previousSnapshot = IndexerSnapshotEntity.load(previousSnapshotId)
        
        // If a snapshot is found, update previous counters
        if(previousSnapshot != null) {
          let previousDelegationRewards = previousSnapshot.delegationRewards
          if(i == 1) {
            snapshot.previousDelegationRewardsDay = snapshot.previousDelegationRewardsDay.plus(previousDelegationRewards)
          }
          if(i < 8) {
            snapshot.previousDelegationRewardsWeek = snapshot.previousDelegationRewardsWeek.plus(previousDelegationRewards)
          }
          snapshot.previousDelegationRewardsMonth = snapshot.previousDelegationRewardsMonth.plus(previousDelegationRewards)
        }
      }

    }
    return snapshot as IndexerSnapshotEntity
  }

  // Determine the monthly reward rate for delegator
  monthlyDelegatorRewardRate(): BigDecimal {
    if(this.delegatedStake().equals(DECIMAL_ZERO)) {
      return DECIMAL_ZERO
    }
    return this.snapshot().previousDelegationRewardsMonth.div(this.delegatedStake())
  }

  // Update the indexer own stake
  updateOwnStake(ownStakeDelta: BigDecimal): void {
    // Add the difference in the snapshot
    let snapshot = this.snapshot()
    snapshot.ownStakeDelta = snapshot.ownStakeDelta.plus(ownStakeDelta)
    snapshot.save()
    this.indexerEntity.lastSnapshot = snapshot.id

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
    let snapshot = this.snapshot()
    snapshot.delegatedStakeDelta = snapshot.delegatedStakeDelta.plus(delegatedStakeDelta)
    snapshot.save()
    this.indexerEntity.lastSnapshot = snapshot.id

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
  savePoolReward(amount: BigDecimal, type: string): void {
    if(amount.gt(DECIMAL_ZERO)) {
      // Add the reward in the snapshot
      let snapshot = this.snapshot()
      snapshot.delegationRewards = snapshot.delegationRewards.plus(amount)
      snapshot.save()

      // Save the Pool Reward
      let rewardId = this.indexerEntity.id
        .concat('-')
        .concat(type)
        .concat('-')
        .concat(this.currentBlock.number.toString())
      let poolReward = new PoolRewardEntity(rewardId)
      poolReward.indexer = this.indexerEntity.id
      poolReward.createdAtBlock = this.currentBlock.number
      poolReward.createdAtTimestamp = this.currentBlock.timestamp
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
    this.savePoolReward(delegatorIndexingRewards, 'IndexingReward')

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
    this.savePoolReward(delegationFees, 'QueryFee')
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
      // Register the change in snapshot
      let snapshot = this.snapshot()
      snapshot.parametersChangeCount++
      snapshot.save()
      this.indexerEntity.lastSnapshot = snapshot.id

      // Store the update
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

    // Save the indexer entity
    this.indexerEntity.save()
  }

}
