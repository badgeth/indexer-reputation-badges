import {
  StakeDeposited,
  StakeWithdrawn,
  StakeSlashed,
  DelegationParametersUpdated,
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

