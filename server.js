const express = require ('express');
const bodyParser = require ('body-parser');
const {Pool} = require("pg");

const app = express();
app.use(bodyParser.json());

const pool = new Pool({
    user: 'your_db_user',
    host: 'localhost', 
    database: 'BiteSpeed',
    password: 'your_db_password',
    port: 5432,
});


