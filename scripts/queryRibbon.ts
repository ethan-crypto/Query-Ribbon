import { ethers } from "hardhat"
import fetch from 'cross-fetch'
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import gql from 'graphql-tag'
import inquirer from 'inquirer'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)


export const POOLS_BULK = (block: number | undefined, pools: string[]) => {
  let poolString = `[`
  pools.map((address) => {
    return (poolString += `"${address}",`)
  })
  poolString += ']'
  const queryString =
    `
    query pools {
      pools(where: {id_in: ${poolString}},` +
    (block ? `block: {number: ${block}} ,` : ``) +
    ` orderBy: totalValueLockedUSD, orderDirection: desc, subgraphError: allow) {
        id
        feeTier
        liquidity
        sqrtPrice
        tick
        token0 {
            id
            symbol 
            name
            decimals
            derivedETH
        }
        token1 {
            id
            symbol 
            name
            decimals
            derivedETH
        }
        poolDayData(first: 95, orderBy: date, orderDirection:desc) {
          txCount
          volumeUSD
          liquidity
          feesUSD
          volumeToken0
          token1Price
        }        
        token0Price
        token1Price
        volumeUSD
        txCount
        totalValueLockedToken0
        totalValueLockedToken1
        totalValueLockedUSD
        feesUSD
      }
    }
    `
  return gql(queryString)
}
export const getRibbonShortPositions = (startTime: number | undefined, vaultAddress: string) => {
  const queryString =
    `
    {
      vaultShortPositions (where: {vault_in: ["${vaultAddress}"],` +
    (startTime ? ` expiry_gt: "${startTime}"` : ``) +
    ` }){
      strikePrice
      openedAt
      closedAt
      openTxhash
      closeTxhash
      expiry
      premiumEarned
      isExcercised
      mintAmount
      depositAmount
      withdrawAmount
      loss
      trades
      }
    }
    `
  return gql(queryString)
}
export const getBlocksFromTimestamps = (timestamps: string[]) => {
  let queryString = 'query blocks {'
  queryString += timestamps.map((timestamp) => {
    return `t${timestamp}:blocks(first: 1, orderBy: timestamp, orderDirection: desc, where: { timestamp_gt: ${timestamp}, timestamp_lt: ${
      timestamp + 600
    } }) {
        number
      }`
  })
  queryString += '}'
  return gql(queryString)
}

export function getMintTimestamps(): number[] {
  const utcCurrentTime = dayjs().startOf('week')
  console.log(utcCurrentTime);
  const t1 = utcCurrentTime.subtract(1, 'day').startOf('minute').unix()
  const t2 = utcCurrentTime.subtract(2, 'day').startOf('minute').unix()
  const tWeek = utcCurrentTime.subtract(1, 'week').startOf('minute').unix()
  return [t1, t2, tWeek]
}
async function main() {
  // 1) query the ethereum blocks subgraph to get the block closest to the timestamp at Friday 11 am UTC
  // https://thegraph.com/explorer/subgraph/blocklytics/ethereum-blocks
  // 2) query the uniswap subgraph to get the 24 hour swap volume for USDC/ETH 0.05 
  // 
  // 3) query the uniswap subgraph to get the tick liquidity
  // 4) query the uniswap subgraph to get the current price of ETH
  // 5) query the ribbon subgraph to get the strike prices.

  const lastPositionsBack = 1

  const startTime = dayjs().utc().startOf('week').subtract(2, "day").subtract(lastPositionsBack - 1, "week").add(11, 'hours').unix()
  console.log(startTime);

  const ribbonClient = new ApolloClient({
    link: new HttpLink({ uri: 'https://api.thegraph.com/subgraphs/name/ribbon-finance/ribbon-v2', fetch }),
    uri: 'https://api.thegraph.com/subgraphs/name/ribbon-finance/ribbon-v2',
    cache: new InMemoryCache(),
  })
  const ribbonResults = await ribbonClient.query({query: getRibbonShortPositions(startTime, "0x25751853eab4d0eb3652b5eb6ecb102a2789644b")})

  console.log(ribbonResults.data)

  const ribbonData = ribbonResults.data.vaultShortPositions.map((position: any) => { delete position.__typename; return position })

  console.log(ribbonData)

  const blockClient = new ApolloClient({
    link: new HttpLink({ uri: 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks', fetch }),
    uri: 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks',
    cache: new InMemoryCache(),
    queryDeduplication: true,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'no-cache',
      },
      query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      },
    },
  })




  

  


  // console.log(dayjs().utc().startOf('week').subtract(2, "day").add(11, 'hours').unix());
  // const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  // const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
  // const unlockTime = currentTimestampInSeconds + ONE_YEAR_IN_SECS;

  // const lockedAmount = ethers.utils.parseEther("1");

  // const Lock = await ethers.getContractFactory("Lock");
  // const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

  // await lock.deployed();

  // console.log(`Lock with 1 ETH and unlock timestamp ${unlockTime} deployed to ${lock.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
