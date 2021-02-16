# Indexer KPI Subgraph

This subgraph tracks The Graph network indexers performance.

## Sample queries

```graphql
{
  indexer(id:"<INDEXER ADDRESS>") {
    id
    createdAtTimestamp
    ownStake
    indexingRewardCutRatio
    queryFeeCutRatio
    updates {
      id
      updatedAtTimestamp
      newQueryFeeCutRatio
      newIndexingRewardCutRatio
      previousQueryFeeCutRatio
      previousIndexingRewardCutRatio
    }
  }
}
```

## Installation

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
