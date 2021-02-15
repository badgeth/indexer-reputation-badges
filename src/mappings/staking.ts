import {
    StakeDeposited,
} from '../../generated/Staking/Staking'
import {
    atAddress as indexerAsAddress,
} from '../models/indexer'
import { TokenStake } from '../models/tokenStake'

// Handle the deposit of a stake
export function handleStakeDeposited(event: StakeDeposited): void {
    // Retrieve event parameters
    let indexerAddress = event.params.indexer
    let rawTokensDeposited = event.params.tokens

    // Update the indexer
    let indexer = indexerAsAddress(indexerAddress)
    if(indexer) {
        let indexerStakeDeposited = TokenStake.fromRawTokens(rawTokensDeposited)
        indexer.ownStake = indexer.ownStake.plus(indexerStakeDeposited.toBigDecimal())
        indexer.save()
    }
}