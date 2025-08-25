const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require("pg");
const dotenv = require('dotenv');
const helmet = require('helmet');
dotenv.config();

const app = express();
app.use(helmet());
app.use(bodyParser.json());

// Basic request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

app.post('/identify', async (req, res) => {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({ error: "Provide email or phoneNumber" });
    }
    try {
        const { rows: contacts } = await pool.query(
            'SELECT * FROM contact WHERE email=$1 OR phoneNumber=$2 ORDER BY createdAt ASC',
            [email, phoneNumber]
        );

        let primary;
        const secondaryIds = [];
        const emails = new Set();
        const phones = new Set();

        if (contacts.length === 0) {
            const { rows } = await pool.query(
                `INSERT INTO Contact (email, phoneNumber) VALUES ($1, $2) RETURNING *`,
                [email, phoneNumber]
            );
            const newContact = rows[0];
            return res.json({
                contact: {
                    primaryContactId: newContact.id,
                    emails: email ? [email] : [],
                    phoneNumbers: phoneNumber ? [phoneNumber] : [],
                    secondaryContactIds: []
                }
            });
        }

        primary = contacts.find(c => c.linkPrecedence === 'primary') || contacts[0];
        contacts.forEach(c => {
            if (c.email) emails.add(c.email);
            if (c.phoneNumber) phones.add(c.phoneNumber);
            if (c.id !== primary.id) secondaryIds.push(c.id);
        });

        const exists = contacts.some(c => c.email === email || c.phoneNumber === phoneNumber);
        if (!exists) {
            const { rows } = await pool.query(
                `INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence) VALUES ($1, $2, $3, 'secondary') RETURNING *`,
                [email, phoneNumber, primary.id]
            );
            const newContact = rows[0];
            secondaryIds.push(newContact.id);
            if (email) emails.add(email);
            if (phoneNumber) phones.add(phoneNumber);
        }

        res.json({
            contact: {
                primaryContactId: primary.id,
                emails: Array.from(emails),
                phoneNumbers: Array.from(phones),
                secondaryContactIds: secondaryIds
            }
        });
    } catch (error) {
        console.error('Error identifying contact:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/', (req, res) => {
    res.send('BiteSpeed Contact Identification Service, use POST /identify to identify contacts. http://localhost:' + (process.env.PORT || 8000) + '/identify');
});

const server = app.listen(process.env.PORT || 8000, () => {
    console.log('Server is running on http://localhost:' + (process.env.PORT || 8000));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    server.close(() => {
        pool.end(() => {
            console.log('Process terminated');
        });
    });
});