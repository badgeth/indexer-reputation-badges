import { Address, ethereum } from "@graphprotocol/graph-ts";
import {
  Indexer as IndexerEntity,
  IndexerMonthlyMetric as IndexerMonthlyMetricEntity,
} from "../../generated/schema";
import { oneBI, zeroBI } from "../helpers/constants";
import { dayMonthYearFromEventTimestamp } from "../helpers/dayMonthYear";
import { DelegatedStake } from "./delegatedStake";
import { Delegator } from "./delegator";

// A class to manage Indexer Snapshot
export class IndexerMonthlyMetric {
  indexerMonthlyMetricEntity: IndexerMonthlyMetricEntity;
  indexerEntity: IndexerEntity;
  currentBlock: ethereum.Block;

  // Initialize an Indexer Snapshot
  constructor(indexerEntity: IndexerEntity, currentBlock: ethereum.Block) {
    this.currentBlock = currentBlock;
    this.indexerEntity = indexerEntity;
    this.indexerMonthlyMetricEntity = this._initializeIndexerMonthlyMetricEntity();
  }

  _initializeIndexerMonthlyMetricEntity(): IndexerMonthlyMetricEntity {
    // Lazy load the snapshot
    let indexerMonthlyMetricEntity = IndexerMonthlyMetricEntity.load(this.id);
    if (indexerMonthlyMetricEntity == null) {
      // Basic Initialization
      indexerMonthlyMetricEntity = new IndexerMonthlyMetricEntity(this.id);
      indexerMonthlyMetricEntity.indexer = this.indexerEntity.id;
      indexerMonthlyMetricEntity.newDelegatorCount = zeroBI();
    }
    indexerMonthlyMetricEntity.save();

    return indexerMonthlyMetricEntity as IndexerMonthlyMetricEntity;
  }

  //--- GETTERS ---//
  get id(): string {
    let dayMonthYear = dayMonthYearFromEventTimestamp(this.currentBlock);
    let month = dayMonthYear.month.toString();
    let year = dayMonthYear.year.toString();
    return this.indexerEntity.id
      .concat("-")
      .concat(month)
      .concat("-")
      .concat(year);
  }

  //-- SETTERS --//
  addNewDelegatorCount(delegatorAddress: Address): void {
    let delegator = new Delegator(delegatorAddress, this.currentBlock);
    let delegatedStake = new DelegatedStake(
      this.indexerEntity,
      delegator.delegatorEntity,
      this.currentBlock
    );

    if (!delegatedStake.isCreatedThisBlock) {
      let newDelegatorCount = this.indexerMonthlyMetricEntity.newDelegatorCount.plus(
        oneBI()
      );

      this.indexerMonthlyMetricEntity.newDelegatorCount = newDelegatorCount;
      this.indexerMonthlyMetricEntity.save();
    }
  }
}
