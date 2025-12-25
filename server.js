import express from 'express'
import fs from 'fs/promises'
import path from 'path'



const app = express()
const PORT = process.env.PORT || 8000
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
// bonus number 1
app.post('/user/register', async (req, res) => {
    const { username, password } = req.body
    const isExist = USERS_DATA.find(user => user.username === username)
    if (isExist) res.status(400).json({ msg: "user already exist" })
    else {
        const newUser = {
            username,
            password,
            role : "user"
        }
        if (!password) res.status(400).json({ msg: "must have password to register" })
        else {
            USERS_DATA.push(newUser)
            await writeData(USERS_PATH, USERS_DATA)
            res.status(201).json({ msg: "user registered succefully" })
        }
    }
})
// bonus number 1
app.post("/creator/events", async (req, res) => {
    const { eventName, ticketsForSale, username, password } = req.body
    const isValid = await validateUser(username, password)
    if (!isValid) res.status(400).json({ msg: "not valid user" })
    else {
        if (isValid.role !== "admin") res.status(400).json({ msg: "only admin can create new event " })
        const newEvent = {
            eventName,
            ticketsForSale,
            username,
            password
        }
        const isExistEvent = EVENTS_DATA.find(event => event.eventName === eventName)
        if (isExistEvent) res.status(400).json({ msg: "cant create event that already exist" })
        else {
            EVENTS_DATA.push(newEvent)
            await writeData(EVENTS_PATH, EVENTS_DATA)
            res.status(201).json({ msg: "Event created successfully" })
        }
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
            if (isExistEvent.ticketsForSale < quantity) throw new Error("not enough tickets")
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

function countTicketsPerUser(data, username) {
    let count = 0
    const tickets = data.filter(user => user.username === username)
    for (let i = 0; i < tickets.length; i++) {
        count += tickets[i].quantity
    }
    return count
}

function collectingEventsPerUser(data, username) {
    const events = []
    const addEvents = data.filter(user => user.username === username)
    for (let i = 0; i < addEvents.length; i++) {
        if (!events.includes(addEvents[i].eventName)) {
            events.push(addEvents[i].eventName)
        }
    }
    return events
}
app.get("/users/:username/summary", (req, res) => {
    const username = req.params.username
    if (RECEIPTS_DATA.length === 0) {
        const emptyObj = {
            totalTicketsBought: 0,
            events: [],
            averageTicketsPerEvent: 0
        }
        return res.status(404).json({ msg: "data is empty", data: emptyObj })
    } else {
        const userSummary = {
            totalTicketsBought: countTicketsPerUser(RECEIPTS_DATA, username),
            events: collectingEventsPerUser(EVENTS_DATA, username),
            averageTicketsPerEvent: countTicketsPerUser(RECEIPTS_DATA, username) / collectingEventsPerUser(EVENTS_DATA, username).length
        }
    res.status(200).json({data: userSummary})
    }
})
// bonus number 3
app.put("/users/:username/return/:eventName", async (req, res) => {
    const {username, eventName} = req.params
    const returnEvent = RECEIPTS_DATA.find(user => user.username === username && user.eventName === eventName)
    if (!returnEvent) res.status(404).json({msg: "not found"})
    else {
    const numTicketsBeforeReturn = returnEvent.quantity
    Object.assign(returnEvent, req.body)
    await writeData(RECEIPTS_PATH, RECEIPTS_DATA)
    const updateEventTickets = EVENTS_DATA.find(user => user.username === username && user.eventName === eventName)
    updateEventTickets.ticketsForSale += numTicketsBeforeReturn
    await writeData(EVENTS_PATH, EVENTS_DATA)
    
    if (req.body.quantity === 0){
        const recipToDelete = RECEIPTS_DATA.filter(event => event.eventName !== eventName)
        await writeData(RECEIPTS_PATH, recipToDelete)
    } 
    
    res.status(200).json({msg:"return update succefully"})
}
})

// bonus number 2
app.get("/users/:username1/:eventName/transfer/:username2", async (req, res) => {
    const {username1, eventName, username2} = req.params
    const transfereEvent = RECEIPTS_DATA.find(user => user.username === username1 && user.eventName === eventName)
    const isExist = USERS_DATA.find(user => user.username === username2)
    if (!transfereEvent || !isExist) res.status(400).json({msg: "not found"})
    else {
        const updateUser = {
            username : username2, 
            password : isExist.password,
            eventName,
            quantity : transfereEvent.quantity
        }
    RECEIPTS_DATA.push(updateUser)
    await writeData(RECEIPTS_PATH, RECEIPTS_DATA)
    const recipToDelete = RECEIPTS_DATA.filter(user => user.username !== username1)
    await writeData(RECEIPTS_PATH, recipToDelete)
    res.status(200).status({msg: "transfer between users successfully"})
}
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});