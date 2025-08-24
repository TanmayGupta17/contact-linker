const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require("pg");
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(bodyParser.json());

const pool = new Pool({
    user: 'your_db_user',
    host: 'localhost',
    database: 'BiteSpeed',
    password: process.env.DB_PASSWORD,
    port: 5432,
});

app.post('/identify', async (req, res) => {
    const { email, phonenumber } = req.body;

    try {
        const { rows: contacts } = await pool.query('SELECT * FROM contact where email=$1 or phonenumber=$2 order by createdAt asc', [email, phonenumber]);

        if (!email && !phoneNumber) {
            return res.status(400).json({ error: "Provide email or phoneNumber" });
        }

        let primary;
        const secondaryIds = [];
        const emails = new Set();
        const phones = new Set();

        if (contacts.length == 0) {
            const { rows } = await pool.query(
                `INSERT INTO Contact (email, phoneNumber) VALUES ($1, $2) RETURNING *`,
                [email, phoneNumber]
            );
            const newContact = rows[0];
            return res.json({
                contact: {
                    primaryContatctId: newContact.id,
                    emails: email ? [email] : [],
                    phoneNumbers: phoneNumber ? [phoneNumber] : [],
                    secondaryContactIds: []
                }
            });
        }
    } catch (error) {
        console.error('Error identifying contact:', error);
        res.status(500).json({ error: 'Internal server error' });
    }

});


