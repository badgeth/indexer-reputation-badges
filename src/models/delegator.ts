import { Address, ethereum } from "@graphprotocol/graph-ts";
import {
  Delegator as DelegatorEntity,
  Indexer as IndexerEntity,
} from "../../generated/schema";

// A class to manage Indexer Snapshot
export class Delegator {
  delegatorEntity: DelegatorEntity;
  indexerEntity: IndexerEntity;
  currentBlock: ethereum.Block;

  // Initialize an Indexer Snapshot
  constructor(address: Address, currentBlock: ethereum.Block) {
    this.delegatorEntity = this._initializeDelegator(address, currentBlock);
  }

  _initializeDelegator(
    address: Address,
    currentBlock: ethereum.Block
  ): DelegatorEntity {
    let delegatorEntity = DelegatorEntity.load(address.toHex());
    if (delegatorEntity == null) {
      delegatorEntity = new DelegatorEntity(address.toHex());
      delegatorEntity.createdAtTimestamp = currentBlock.timestamp;
      delegatorEntity.save();
    }

    return delegatorEntity as DelegatorEntity;
  }
}
