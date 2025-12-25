import express from 'express'
import fs from 'fs/promises'
import path from 'path'



const app = express()
const PORT = 8000
const __dirname = path.resolve();
const EVENTS_PATH = path.join(__dirname, "data", "events.json");
const RECEIPTS_PATH = path.join(__dirname, "data", "receipts.json");
const USERS_PATH = path.join(__dirname, "data", "users.json");
const EVENTS_DATA = await readData(EVENTS_PATH)
const RECEIPTS_DATA = await readData(RECEIPTS_PATH)
const USERS_DATA = await readData(USERS_PATH)

app.use(express.json())

async function readData(path) {
    const data = await fs.readFile(path, 'utf-8');
    return JSON.parse(data);
}

async function writeData(path, data) {
    await fs.writeFile(path, JSON.stringify(data, null, 2));
}

