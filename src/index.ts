import axios, { AxiosRequestConfig } from 'axios';
import pg from 'pg'
import {Command} from 'commander'
import * as figlet from 'figlet'

const {Client} = pg;

const program = new Command();
program
    .version("1.0.0")
    .description("Sync kobo with postgres db")
    .option("-c, --connection-string  [value]", "connection string")
    .option("-s, --server [value]", "kobo server")
    .option("-t, --token [value]", "kobo token")
    .option("-a, --asset [value]", "kobo asset/survey")
    .parse(process.argv);

const options = program.opts();

const connectionString = options.connectionString;
const server = options.server;
const token = options.token;
const asset = options.asset;

main().then( x=> {
    console.log("exiting");   
    //process.exit()
});


async function main() {
    const lastSyncDate = await getLastSyncDate(connectionString);
    console.log("Last sync date: ", lastSyncDate)
    const data = await getData(server,asset, lastSyncDate, token );
    console.log("Total records to scan: ", data.results.length);
    const insertCount = await update(connectionString, data, lastSyncDate);
    console.log("Records inserted: ", insertCount);
}


async function getData( server:string, asset:string, date:Date, token:string) {
    const url = `${server}/api/v2/assets/${asset}/data.json`;
    
    const auth = `Token ${token}`;
    const axiosOptions: AxiosRequestConfig<any> =  {
        headers: { "Authorization": auth }
    };
    
    const dataResponse = await axios.get(url, axiosOptions);

    return await dataResponse.data;
}

async function getLastSyncDate(
    connectionString:string
) {
    const client = new Client({
        connectionString:connectionString
    });

    await client.connect();

    const res = await client.query('select max(sync_date) as last_sync_date from form_sync;');
    const date = await res.rows[0].last_sync_date;
    await client.end();
    
    return date as Date;
}

async function update(connectionString:string, data:any, last_sync_date:Date) {
    
    let insertCount = 0;

    const insertSql = "insert into form_sync (form) values ($1) ";
    const client = new Client({
        connectionString:connectionString
    });

    await client.connect();
    
    for(let i=0; i < data.results.length; i++) {
        const row = data.results[i];
        const submissionDate = new Date(row._submission_time);
        if(submissionDate < last_sync_date) continue;
        const queryResult = await client.query(insertSql, [row]);
        insertCount++;
        //console.log(queryResult);
    }

    await client.end();
    
    return insertCount;
}