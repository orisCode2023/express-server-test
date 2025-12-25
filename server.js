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

// async function fileExists(filePath) {
//   try {
//     await fs.access(filePath, fs.constants.F_OK);
//     return true;
//   } catch (error) {
//     return false;
//   }
// }

async function validateUser(username, password) {
    const findUsername = USERS_DATA.find(user => user.username === username && user.password === password)
    return findUsername || null
}

app.post('/user/register', async (req, res) => {
    const { username, password } = req.body
    const isExist = USERS_DATA.find(user => user.username === username)
    if (isExist) res.status(400).json({ msg: "user already exist" })
    else {
        const newUser = {
            username,
            password
        }
        if (!password) res.status(400).json({ msg: "must have password to register" })
        else {
            USERS_DATA.push(newUser)
            await writeData(USERS_PATH, USERS_DATA)
            res.status(201).json({ msg: "user registered succefully" })
        }
    }
})

app.post("/creator/events", async (req, res) => {
    const { eventName, ticketsForSale, username, password } = req.body
    const isValid = await validateUser(username, password)
    if (!isValid) res.status(400).json({ msg: "not valid user" })
    else {
        const newEvent = {
            eventName,
            ticketsForSale,
            username,
            password
        }
        EVENTS_DATA.push(newEvent)
        await writeData(EVENTS_PATH, EVENTS_DATA)
        res.status(201).json({ msg: "Event created successfully" })
    }
})

app.post("/users/tickets/buy", async (req, res) => {
    const { username, password, eventName, quantity } = req.body
    const isValid = await validateUser(username, password)
    if (!isValid) res.status(400).json({ msg: "not valid user" })
    else {
        const isExistEvent = EVENTS_DATA.find(event => event.eventName === eventName)
        if (!isExistEvent) res.status(400).json({ msg: "no event found" })
        else {
            const newReceipts = {
                username,
                password,
                eventName,
                quantity
            }
            if (isExistEvent.ticketsForSale < quantity) res.status(400).json({ msg: "not enough tickets" })
            else {
                RECEIPTS_DATA.push(newReceipts)
                await writeData(RECEIPTS_PATH, RECEIPTS_DATA)
                isExistEvent.ticketsForSale -= quantity
                await writeData(EVENTS_PATH, EVENTS_DATA)
                res.status(201).json({ msg: "Tickets purchased successfully" })
            }
        }
    }
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});