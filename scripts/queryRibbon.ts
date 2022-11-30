import { ethers } from "hardhat"
import fetch from 'cross-fetch'
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import gql from 'graphql-tag'
import inquirer from 'inquirer'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

const btcVault = "0x65a833afDc250D9d38f8CD9bC2B1E3132dB13B2F"
const ethVault = "0x25751853eab4d0eb3652b5eb6ecb102a2789644b"

export const getRibbonShortPositions = (first: number | undefined, vaultAddress: string) => {
  const queryString =
    `
    {
      vaultShortPositions (where: {vault_in: ["${vaultAddress}"]}` +
    ` orderBy: openedAt
      orderDirection: desc
      first: ${first}` +
    ` ){
        strikePrice
        openedAt
        closedAt
        openTxhash
        closeTxhash
        expiry
        premiumEarned
        isExercised
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

async function main() {

  // gets the last 3 results
  const lastResults = 3

  const ribbonClient = new ApolloClient({
    link: new HttpLink({ uri: 'https://api.thegraph.com/subgraphs/name/ribbon-finance/ribbon-v2', fetch }),
    uri: 'https://api.thegraph.com/subgraphs/name/ribbon-finance/ribbon-v2',
    cache: new InMemoryCache(),
  })
  const ribbonResults = await ribbonClient.query({query: getRibbonShortPositions(3, ethVault)})

  console.log(ribbonResults.data)

  const ribbonData = ribbonResults.data.vaultShortPositions.map((position: any) => { delete position.__typename; return position })

  console.log(ribbonData)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
