import { RewardsAssigned } from "../../generated/RewardsManager/RewardsManager";
import { Indexer } from "../models/indexer";

/**
 * @dev Emitted when rewards are assigned to an indexer.
 * Parameters:
    address indexed indexer,
    address indexed allocationID,
    uint256 epoch,
    uint256 amount
 */
export function handleRewardsAssigned(event: RewardsAssigned): void {
  let indexer = new Indexer(event.params.indexer, event.block);
  indexer.handleRewardsAssigned(event);
}
