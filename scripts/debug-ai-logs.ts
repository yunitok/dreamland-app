
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

async function main() {
  console.log('Connecting to DB...')
  await client.connect()
  
  console.log('Checking AiUsageLog...')
  try {
      const res = await client.query(`SELECT * FROM "AiUsageLog" ORDER BY "createdAt" DESC LIMIT 5;`)
      console.log(`Found ${res.rows.length} logs.`)
      console.log(JSON.stringify(res.rows, null, 2))
  } catch (e) {
      console.error(e)
  } finally {
      await client.end()
  }
}

main()
