# Indexer KPI Subgraph

This subgraph tracks The Graph network indexers performance.

## Metrics implemented

* Indexer Background:
  * `createdAtTimestamp`: UNIX Timestamp when the Indexer went live
  * `vesting/managedAmount`: Amount of GRT received as part of the official testnet program
  * `vesting/beneficiary`: Ethereum address of the beneficiary of the vesting contract
* Indexer Parameters
  * `ownStake`: GRT Tokens staked in the protocol by the Indexer itself
  * `delegatedStake`: GRT Tokens delegated to the Indexer
  * `allocatedStake`: GRT Tokens allocated by the Indexer in the protocol
  * `allocationRatio`: Ratio of allocated tokens versus allocation capacity
  * `maximumDelegation`: Maximum GRT Tokens that can be delegated to this Indexer before overdelegation
  * `delegationRatio`: GRT Tokens delegated to this indexer versus maximum delegation
  * `isOverDelegated`: Flag to indicate if this Indexer is overdelegated
* Delegation Parameters
  * `indexingRewardCutRatio`: Indexing Reward Cut Ratio (between 0 and 1)
  * `queryFeeCutRatio`: Query Fee Cut Ratio (between 0 and 1)
  * `parameterUpdates`: List of all parameters update
* Metrics of last 30 days (rolling period)
  * `lastMonthParametersUpdateCount`: Number of updates on the parameters over the last 30 days
  * `lastMonthDelegatorRewardRate`: Reward per GRT token delegated over the last 30 days

## Local development

The below instructions are adapted from The Graph [Quick Start Instructions](https://thegraph.com/docs/quick-start).

Clone the source code:

```shell
git clone git@github.com:mtahon/indexer-kpi-subgraph.git
```

Install dependencies:

```shell
yarn install
```

## Deploy to The Graph

The below commands deploy to The Graph hosted environment

Create an access token and store it locally. `<ACCESS_TOKEN>` is from The Graph Dashboard.

```shell
graph auth https://api.thegraph.com/deploy/ `<ACCESS_TOKEN>`
```

Then deploy:

```shell
yarn deploy
```
