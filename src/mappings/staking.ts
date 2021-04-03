/**
 * This mapping handles the events from the Staking contract
 * https://github.com/graphprotocol/contracts/blob/master/contracts/staking/Staking.sol
 */

import { log } from "@graphprotocol/graph-ts";
import {
  AllocationClosed,
  AllocationCollected,
  AllocationCreated,
  DelegationParametersUpdated,
  RebateClaimed,
  StakeDelegated,
  StakeDelegatedLocked,
  StakeDelegatedWithdrawn,
  StakeDeposited,
  StakeLocked,
  StakeSlashed,
  StakeWithdrawn,
} from "../../generated/Staking/Staking";
import {
  awardItsOnlyWaferThinBadge,
  becomesOverDelegated,
} from "../factories/badges";
import { dayMonthYearFromEventTimestamp } from "../helpers/dayMonthYear";
import { Indexer } from "../models/indexer";

/**
 * @dev Emitted when `indexer` update the delegation parameters for its delegation pool.
 * Parameters:
 *   address indexer
 *   uint32 indexingRewardCut
 *   uint32 queryFeeCut
 *   uint32 cooldownBlocks
 */
export function handleDelegationParametersUpdated(
  event: DelegationParametersUpdated
): void {
  let indexer = new Indexer(event.params.indexer, event.block);
  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleDelegationParametersUpdated(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}

/**
 * @dev Emitted when `indexer` stake `tokens` amount.
 * Parameters:
 *   address indexer
 *   uint256 tokens
 */
export function handleStakeDeposited(event: StakeDeposited): void {
  let indexer = new Indexer(event.params.indexer, event.block);
  log.info("Time = {}", [
    dayMonthYearFromEventTimestamp(event).month.toString(),
  ]);

  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleStakeDeposited(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}

/**
 * @dev Emitted when `indexer` unstaked and locked `tokens` amount `until` block.
 * Parameters:
 *   address indexer
 *   uint256 tokens
 *   uint256 until
 */
export function handleStakeLocked(event: StakeLocked): void {
  let indexer = new Indexer(event.params.indexer, event.block);

  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleStakeLocked(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}

/**
 * @dev Emitted when `indexer` withdrew `tokens` staked.
 * Parameters:
 *   address indexer
 *   uint256 tokens
 */
export function handleStakeWithdrawn(event: StakeWithdrawn): void {
  let indexer = new Indexer(event.params.indexer, event.block);

  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleStakeWithdrawn(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}

/**
 * @dev Emitted when `indexer` was slashed for a total of `tokens` amount.
 * Tracks `reward` amount of tokens given to `beneficiary`.
 * Parameters:
 *   address indexer
 *   uint256 tokens
 *   uint256 reward,
 *   address beneficiary
 */
export function handleStakeSlashed(event: StakeSlashed): void {
  let indexer = new Indexer(event.params.indexer, event.block);
  indexer.handleStakeSlashed(event);
}

/**
 * @dev Emitted when `delegator` delegated `tokens` to the `indexer`, the delegator
 * gets `shares` for the delegation pool proportionally to the tokens staked.
 * Parameters:
 *   address indexer
 *   address delegator
 *   uint256 tokens,
 *   uint256 shares
 */
export function handleStakeDelegated(event: StakeDelegated): void {
  let indexer = new Indexer(event.params.indexer, event.block);

  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleStakeDelegated(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}

/**
 * @dev Emitted when `delegator` undelegated `tokens` from `indexer`.
 * Tokens get locked for withdrawal after a period of time.
 * Parameters:
 *   address indexer
 *   address delegator
 *   uint256 tokens
 *   uint256 shares
 *   uint256 until
 */
export function handleStakeDelegatedLocked(event: StakeDelegatedLocked): void {
  let indexer = new Indexer(event.params.indexer, event.block);

  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleStakeDelegatedLocked(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}

/**
 * @dev Emitted when `delegator` withdrew delegated `tokens` from `indexer`.
 * Parameters:
 *   address indexer
 *   address delegator
 *   uint256 tokens
 */
export function handleStakeDelegatedWithdrawn(
  event: StakeDelegatedWithdrawn
): void {
  let indexer = new Indexer(event.params.indexer, event.block);

  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleStakeDelegatedWithdrawn(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}

/**
 * @dev Emitted when `indexer` allocated `tokens` amount to `subgraphDeploymentID`
 * during `epoch`.
 * `allocationID` indexer derived address used to identify the allocation.
 * `metadata` additional information related to the allocation.
 * Parameters:
 *   address indexed indexer,
 *   bytes32 indexed subgraphDeploymentID,
 *   uint256 epoch,
 *   uint256 tokens,
 *   address indexed allocationID,
 *   bytes32 metadata
 */
export function handleAllocationCreated(event: AllocationCreated): void {
  let indexer = new Indexer(event.params.indexer, event.block);

  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleAllocationCreated(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}

/**
 * @dev Emitted when `indexer` collected `tokens` amount in `epoch` for `allocationID`.
 * These funds are related to `subgraphDeploymentID`.
 * The `from` value is the sender of the collected funds.
 * Parameters:
 *   address indexed indexer,
 *   bytes32 indexed subgraphDeploymentID,
 *   uint256 epoch,
 *   uint256 tokens,
 *   address indexed allocationID,
 *   address from,
 *   uint256 curationFees,
 *   uint256 rebateFees
 */
export function handleAllocationCollected(event: AllocationCollected): void {
  let indexer = new Indexer(event.params.indexer, event.block);

  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleAllocationCollected(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}

/**
 * @dev Emitted when `indexer` close an allocation in `epoch` for `allocationID`.
 * An amount of `tokens` get unallocated from `subgraphDeploymentID`.
 * The `effectiveAllocation` are the tokens allocated from creation to closing.
 * This event also emits the POI (proof of indexing) submitted by the indexer.
 * `isDelegator` is true if the sender was one of the indexer's delegators.
 * Parameters:
 *   address indexed indexer,
 *   bytes32 indexed subgraphDeploymentID,
 *   uint256 epoch,
 *   uint256 tokens,
 *   address indexed allocationID,
 *   uint256 effectiveAllocation,
 *   address sender,
 *   bytes32 poi,
 *   bool isDelegator
 */
export function handleAllocationClosed(event: AllocationClosed): void {
  let indexer = new Indexer(event.params.indexer, event.block);

  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleAllocationClosed(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}

/**
 * @dev Emitted when `indexer` claimed a rebate on `subgraphDeploymentID` during `epoch`
 * related to the `forEpoch` rebate pool.
 * The rebate is for `tokens` amount and `unclaimedAllocationsCount` are left for claim
 * in the rebate pool. `delegationFees` collected and sent to delegation pool.
 * Parameters:
 *   address indexed indexer,
 *   bytes32 indexed subgraphDeploymentID,
 *   address indexed allocationID,
 *   uint256 epoch,
 *   uint256 forEpoch,
 *   uint256 tokens,
 *   uint256 unclaimedAllocationsCount,
 *   uint256 delegationFees
 */
export function handleRebateClaimed(event: RebateClaimed): void {
  let indexer = new Indexer(event.params.indexer, event.block);

  let isOverDelegated = indexer.indexerEntity.isOverDelegated;

  indexer.handleRebateClaimed(event);

  if (
    becomesOverDelegated(isOverDelegated, indexer.indexerEntity.isOverDelegated)
  ) {
    awardItsOnlyWaferThinBadge(indexer.id, event.block);
  }
}
