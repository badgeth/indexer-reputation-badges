import {
  StakeDeposited,
  StakeWithdrawn,
  StakeSlashed,
  DelegationParametersUpdated,
  StakeDelegated,
  StakeDelegatedWithdrawn,
  AllocationCreated,
  AllocationCollected,
  AllocationClosed,
  RebateClaimed,
} from '../../generated/Staking/Staking'

import {
  Indexer
} from '../models/indexer'

// Handle the deposit of a stake
export function handleStakeDeposited(event: StakeDeposited): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleStakeDeposited(event)
}

// Handle the withdrawal of a stake
export function handleStakeWithdrawn(event: StakeWithdrawn): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleStakeWithdrawn(event)
}

// Handle the slashing of a stake
export function handleStakeSlashed(event: StakeSlashed): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleStakeSlashed(event)
}

// Handle a change in Indexer delegation parameters
export function handleDelegationParametersUpdated(event: DelegationParametersUpdated): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleDelegationParametersUpdated(event)
}

export function handleStakeDelegated(event: StakeDelegated): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleStakeDelegated(event)
}

export function handleStakeDelegatedWithdrawn(event: StakeDelegatedWithdrawn): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleStakeDelegatedWithdrawn(event)
}

export function handleAllocationCreated(event: AllocationCreated): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleAllocationCreated(event)
}

export function handleAllocationCollected(event: AllocationCollected): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleAllocationCollected(event)
}

export function handleAllocationClosed(event: AllocationClosed): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleAllocationClosed(event)
}

export function handleRebateClaimed(event: RebateClaimed): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleRebateClaimed(event)
}