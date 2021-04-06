import { Address, ethereum } from "@graphprotocol/graph-ts";
import { Delegator as DelegatorEntity } from "../../generated/schema";

// A class to manage Indexer Snapshot
export class Delegator {
  delegatorEntity: DelegatorEntity;
  currentBlock: ethereum.Block;

  // Initialize an Indexer Snapshot
  constructor(address: Address, currentBlock: ethereum.Block) {
    let delegatorEntity = this._initializeDelegator(address, currentBlock);
    this.delegatorEntity = delegatorEntity;
  }

  _initializeDelegator(
    address: Address,
    currentBlock: ethereum.Block
  ): DelegatorEntity {
    let delegatorEntity = DelegatorEntity.load(address.toHex());
    if (delegatorEntity == null) {
      delegatorEntity = new DelegatorEntity(address.toHex());
      delegatorEntity.createdAtTimestamp = currentBlock.timestamp;
    }
    delegatorEntity.save();

    return delegatorEntity as DelegatorEntity;
  }

  get isCreatedThisBlock(): boolean {
    return (
      this.delegatorEntity.createdAtTimestamp == this.currentBlock.timestamp
    );
  }
}
