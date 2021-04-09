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
  log.info("WEEEE", {});
  // let indexer = new Indexer(event.params.indexer, event.block);
  // indexer.handleDelegationParametersUpdated(event);
}
