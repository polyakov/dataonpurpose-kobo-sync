import axios, { AxiosRequestConfig } from "axios";
import pg from "pg";
import { Command } from "commander";
import * as figlet from "figlet";

const { Client } = pg;

const program = new Command();
program
  .version("1.0.0")
  .description("Sync kobo with postgres db")
  .option("-c, --connection-string  [value]", "connection string")
  .option("-s, --server [value]", "kobo server")
  .option("-t, --token [value]", "kobo token")
  .option("-a, --asset [value]", "kobo asset/survey")
  .parse(process.argv);

/*
Assumptions:
- connection string and kobo connection parameters are correct
- table exists in the database with the correct columns and permissions
*/

const options = program.opts();

const connectionString = options.connectionString;
const server = options.server;
const token = options.token;
const asset = options.asset;

main().then((x) => {
  console.log("exiting");
});

async function main() {
  const lastSyncDate = await getLastSyncDate(connectionString);
  console.log("Last sync date: ", lastSyncDate);

  //load this from somewhere another start is known
  const dbRecordCount = await getRecordCount(connectionString);
  console.log(`DB Record count: ${dbRecordCount}`)
  let syncStart = dbRecordCount;
  let syncLimit = 30000;

  let data: any = null;
  do {
    data = await getData(
      server,
      asset,
      lastSyncDate,
      syncStart,
      syncLimit,
      token
    );
    console.log("Total records to scan: ", data.results.length);

    const insertCount = await update(connectionString, data, lastSyncDate);
    console.log("Records inserted: ", insertCount);

    syncStart += syncLimit;
  } while (!(data.results.length < syncLimit)); //stop if return is less than
}

async function getData(
  server: string,
  asset: string,
  date: Date,
  syncStart: number,
  syncLimit: number,
  token: string
) {
  try {
    const url = `${server}/api/v2/assets/${asset}/data.json?start=${syncStart}&limit=${syncLimit}`;
    console.log(url);

    const auth = `Token ${token}`;
    const axiosOptions: AxiosRequestConfig<any> = {
      headers: { Authorization: auth },
    };

    const dataResponse = await axios.get(url, axiosOptions);

    return await dataResponse.data;
  } catch (e) {
    console.log(
      `Failed to get data from ${server}, ${asset}.  Error: ${JSON.stringify(
        e
      )}`
    );
    throw e;
  }
}

async function getLastSyncDate(connectionString: string) {
  try {
    const client = new Client({
      connectionString: connectionString,
    });

    await client.connect();

    const res = await client.query(
      "select max(sync_date) as last_sync_date from kobo_form_sync;"
    );
    const date = await res.rows[0].last_sync_date;
    await client.end();

    return date as Date;
  } catch (e) {
    console.log(`Failed to get last sync date.  Error: ${JSON.stringify(e)}`);
    throw e;
  }
}

async function getRecordCount( connectionString:string) {
    const client = new Client({
        connectionString: connectionString,
      });
  
      await client.connect();
  
      const res = await client.query(
        "select count(1) as record_count from kobo_form_sync;"
      );
      const record_count = await res.rows[0].record_count;
      await client.end();

      return record_count as number;
}

async function update(
  connectionString: string,
  data: any,
  last_sync_date: Date 
) {
  try {
    let insertCount = 0;

    const insertSql = "insert into kobo_form_sync (id, form) values ($1, $2) ON CONFLICT (id) DO NOTHING; ";
    const client = new Client({
      connectionString: connectionString,
    });

    await client.connect();

    for (let i = 0; i < data.results.length; i++) {
      const row = data.results[i];
      const id = row._id;
    //   const submissionDate = new Date(row._submission_time);
    //   if (submissionDate < last_sync_date) continue;
      const queryResult = await client.query(insertSql, [id, row]);
      insertCount += queryResult.rowCount ?? 0;
      //console.log(queryResult);
    }

    await client.end();

    return insertCount;
  } catch (e) {
    console.log(`DB update filed. Error: ${JSON.stringify(e)}`);
    throw e;
  }
}
