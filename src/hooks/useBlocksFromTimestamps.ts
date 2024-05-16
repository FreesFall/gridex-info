import gql from 'graphql-tag'
import { useState, useEffect, useMemo } from 'react'
import { splitQuery } from 'utils/queries'
import { START_BLOCKS } from 'constants/index'
import { useActiveNetworkVersion, useBlockNumber, useClients } from 'state/application/hooks'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'

export const GET_BLOCKS = (timestamps: string[]) => {
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

/**
 * for a given array of timestamps, returns block entities
 * @param timestamps
 */
export function useBlocksFromTimestamps(
  timestamps: number[],
  blockClientOverride?: ApolloClient<NormalizedCacheObject>
): {
  blocks:
    | {
        timestamp: string
        number: any
      }[]
    | undefined
  error: boolean
} {
  const [activeNetwork] = useActiveNetworkVersion()
  const [blocks, setBlocks] = useState<any>()
  const [error, setError] = useState(false)

  const { blockClient } = useClients()
  const activeBlockClient = blockClientOverride ?? blockClient

  // derive blocks based on active network
  const networkBlocks = blocks?.[activeNetwork.id]
  // const blockNumber= useBlockNumber();
  useEffect(() => {
    // 计算给定日期的8点对应的区块号
    const calculateBlockNumberFor8AM=(daysAgo:any, currentBlockNumber:any, currentDate:any)=>{
      const millisecondsPerBlock = 6000;
      const now = currentDate; // 获取当前时间
      const todayAt8AM = new Date(now.getFullYear(), now.getMonth(), now.getDate()-daysAgo, 8, 0, 0); // 设置为今天的8点
      const timeDifference = currentDate.getTime() -  todayAt8AM.getTime(); // 时间差（毫秒）
      const blocksAgo = timeDifference / millisecondsPerBlock;
      return {date:todayAt8AM.getTime(),block:Math.floor(currentBlockNumber - blocksAgo)};
    }
    // 计算包括今天在内的前10天每天8点的区块号
    const calculateBlockNumbersForLast10Days8AM=(timestamps:any[],currentBlockNumber:any)=>{
      const currentDate = new Date(); // 当前日期和时间
      const blockNumbers :any= [];

      // for (let daysAgo = 0; daysAgo <= 10; daysAgo++) {
      //   const blockNumberForDay = calculateBlockNumberFor8AM(daysAgo, currentBlockNumber, currentDate);
      //   blockNumbers.push(blockNumberForDay);
      // }

      const currentTimestamp = Math.floor(Date.now() / 1000); // 获取当前时间戳（秒）
      const timestamp = timestamps; // 三个时间戳
      const res=timestamps.map((t,index)=>{
        const diffSeconds = currentTimestamp - t;
        const diffDays = diffSeconds / (60 * 60 * 24); // 将秒转换为天
        console.log(`${index}: ${diffDays} days ago`);
        return Math.floor(diffDays);
      })
      console.log("结果",res)
   
      for(const p of res){
        const blockNumberForDay = calculateBlockNumberFor8AM(p, currentBlockNumber, currentDate);
        blockNumbers.push(blockNumberForDay);
      }
      console.log(blockNumbers)
      return blockNumbers;
    }


    async function fetchData() {
      calculateBlockNumbersForLast10Days8AM(timestamps, "55555555")
      const results:any={
        "data": {
            "t1715744820": [
                {
                    "number": "19872834",
                    "__typename": "Block"
                }
            ],
            "t1715658420": [
                {
                    "number": "19865711",
                    "__typename": "Block"
                }
            ],
            "t1715226420": [
                {
                    "number": "19829947",
                    "__typename": "Block"
                }
            ]
        }
      }
      // TO DO
      // const results = await splitQuery(GET_BLOCKS, activeBlockClient, [], timestamps)
      if (results) {
        setBlocks({ ...(blocks ?? {}), [activeNetwork.id]: results })
      } else {
        setError(true)
      }
    }
    if (!networkBlocks && !error) {
      fetchData()
    }
  })

  const blocksFormatted = useMemo(() => {
    if (blocks?.[activeNetwork.id]) {
      const networkBlocks = blocks?.[activeNetwork.id]
      const formatted:any = []
      for (const t in networkBlocks) {
        if (networkBlocks[t].length > 0) {
          const number = networkBlocks[t][0]['number']
          const deploymentBlock = START_BLOCKS[activeNetwork.id]
          const adjustedNumber = number > deploymentBlock ? number : deploymentBlock

          formatted.push({
            timestamp: t.split('t')[1],
            number: adjustedNumber,
          })
        }
      }
      return formatted
    }
    return undefined
  }, [activeNetwork.id, blocks])

  return {
    blocks: blocksFormatted,
    error,
  }
}

/**
 * @notice Fetches block objects for an array of timestamps.
 * @dev blocks are returned in chronological order (ASC) regardless of input.
 * @dev blocks are returned at string representations of Int
 * @dev timestamps are returns as they were provided; not the block time.
 * @param {Array} timestamps
 */
export async function getBlocksFromTimestamps(
  timestamps: number[],
  blockClient: ApolloClient<NormalizedCacheObject>,
  skipCount = 500
) {
  if (timestamps?.length === 0) {
    return []
  }
  const fetchedData: any = await splitQuery(GET_BLOCKS, blockClient, [], timestamps, skipCount)

  const blocks: any[] = []
  if (fetchedData) {
    for (const t in fetchedData) {
      if (fetchedData[t].length > 0) {
        blocks.push({
          timestamp: t.split('t')[1],
          number: fetchedData[t][0]['number'],
        })
      }
    }
  }
  return blocks
}
