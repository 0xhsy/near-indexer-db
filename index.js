const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', async (req, res) => {
    res.status(200).send('Hello World');
});

app.get('/accounts', async function (req, res) {
    const address = req.query['address'];
    const connection = [
        'postgres://public_readonly:nearprotocol@mainnet.db.explorer.indexer.near.dev/mainnet_explorer',
        'postgres://public_readonly:nearprotocol@testnet.db.explorer.indexer.near.dev/testnet_explorer',
    ];

    const addPrefix = (rows, net) => {
        if(rows.length){
            rows.map((row)=>{
                if(hasAccountId(row['account_id'])){
                    return row['account_id'];
                }else{
                    return row['account_id'] = net + ':' + row['account_id'];
                }
            });
        }
    };
  
    const hasAccountId = (address) => {
        return address.split('.').pop() == 'near' || address.split('.').pop() == 'testnet';
    };

    const accountsIds = await Promise.all(connection.map(async (connectionString, idx) => {

        const { rows } = await new Pool({
            connectionString,
        }).query(`
          SELECT DISTINCT account_id
          FROM access_keys
          JOIN accounts USING (account_id)
          WHERE public_key = $1
              AND accounts.deleted_by_receipt_id IS NULL
              AND access_keys.deleted_by_receipt_id IS NULL
        `, [address]);

        if(idx){
            addPrefix(rows, 'testnet');
        }else{
            addPrefix(rows, 'mainnet');
        }

        return rows;

    }));

    const result = accountsIds.reduce((acc, cur) => acc.concat(cur)).map((account) => account['account_id']);

    res.send(result);

});

app.listen(port, () => {
    console.log(`App running on port ${port}.`);
});