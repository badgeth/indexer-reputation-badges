import {
  RewardsAssigned,
} from '../../generated/RewardsManager/RewardsManager'

import {
  Indexer
} from '../models/indexer'

// Handle the distribution of reward
export function handleRewardsAssigned(event: RewardsAssigned): void {
  let indexer = new Indexer(event.params.indexer)
  indexer.handleRewardsAssigned(event)
}