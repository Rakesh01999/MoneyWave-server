const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uuibjb3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const userCollection = client.db("moneyDb").collection("users");


        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token });
        })

 
        // user related api
        // Registration API
        app.post('/users', async (req, res) => {
            const { name, email, pin, mobileNumber, role } = req.body;

            // Hash the PIN
            const hashedPin = await bcrypt.hash(pin, 10);
            // const hashedPin =  pin;

            const user = {
                name,
                email,
                pin: hashedPin,
                mobileNumber,
                status: "pending",
                balance: 0 ,// Initial balance, update upon approval
                role: role 
            };

            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null });
            }

            const result = await userCollection.insertOne(user);
            res.send(result);
        });



         // User login API
         app.post('/login', async (req, res) => {
            const { identifier, pin } = req.body; // identifier can be email or mobile number
            const query = {
                $or: [
                    { email: identifier },
                    { mobileNumber: identifier }
                ]
            };
            console.log(query);

            try {
                const user = await userCollection.findOne(query);
                if (!user) {
                    return res.status(401).json({ message: 'Invalid Email/Mobile Number or PIN' });
                }

                const isPinValid = await bcrypt.compare(pin, user.pin);
                console.log(isPinValid);
                if (!isPinValid) {
                    return res.status(401).json({ message: 'Invalid Email/Mobile Number or PIN' });
                }

                const token = jwt.sign({ id: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, {
                    expiresIn: '1h'
                });
                console.log(token);
                res.json({ token });
            } catch (error) {
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });


        app.get('/users', async (req, res) => {
            // app.get('/users', verifyToken, async (req, res) => {
            // console.log(req.headers);
            const result = await userCollection.find().toArray();
            res.send(result);
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('money is waving');
})

app.listen(port, () => {
    console.log(`money is waving on port ${port}`);
})
