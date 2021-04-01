import { Address } from "@graphprotocol/graph-ts";
import { IndexerVesting as IndexerVestingEntity } from "../../generated/schema";
import { GraphTokenLockWallet } from "../../generated/Staking/GraphTokenLockWallet";
import { tokenAmountToDecimal } from "../helpers/token";

// A class to manage Indexer Snapshot
export class IndexerVesting {
  indexerVestingEntity: IndexerVestingEntity | null;
  address: Address;
  wallet: GraphTokenLockWallet;

  // Initialize an Indexer Snapshot
  constructor(indexerAddress: Address) {
    this.address = indexerAddress;
    this.wallet = GraphTokenLockWallet.bind(this.address);
    this.indexerVestingEntity = null;
    this._tryCreateEntity();
  }

  _tryCreateEntity(): void {
    this.indexerVestingEntity = IndexerVestingEntity.load(this.address.toHex());
    if (this.indexerVestingEntity == null) {
      let beneficiaryCall = this.wallet.try_beneficiary();
      let managedAmountCall = this.wallet.try_managedAmount();
      if (!beneficiaryCall.reverted && !managedAmountCall.reverted) {
        this.indexerVestingEntity = new IndexerVestingEntity(
          this.address.toHex()
        );
        this.indexerVestingEntity.beneficiary = beneficiaryCall.value;
        this.indexerVestingEntity.managedAmount = tokenAmountToDecimal(
          managedAmountCall.value
        );
        this.indexerVestingEntity.indexer = this.indexerVestingEntity.id;
        this.indexerVestingEntity.save();
      }
    }
  }

  get isVesting(): boolean {
    return this.indexerVestingEntity != null;
  }
}
