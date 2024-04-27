const express = require("express");
const fs = require('fs');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const propertiesReader = require("properties-reader");
const path = require("path");
const propertiesPath = path.resolve(__dirname, "conf/db.properties");
const properties = propertiesReader(propertiesPath);
app.use(cors({ origin: "*" }));
app.use(express.json());
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// MongoDB Connections
let dbPprefix = properties.get("db.prefix");
//for potential special characters
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params")
//URL-Encoding of User and PWD
const username = encodeURIComponent(properties.get("db.user"));
const pass = encodeURIComponent(properties.get("db.pwd"));
const uri = dbPprefix + username + ":" + pass + dbUrl + dbParams;
const db_name = properties.get("db.dbName");
const db_exercises_collection_name = "exercises";
const db_patients_collection_name = "patients";



const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });


const generateSecretKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

const secretKey = generateSecretKey();
console.log('Secret Key:', secretKey);

const JWT_SECRET = process.env.JWT_SECRET || secretKey;


const fetchexercises = async (req, res) => {

    await client.connect();

    const db = client.db(db_name);

    const exercises_collection = db.collection(db_exercises_collection_name);

    const fetchedexercises = await exercises_collection.find({}).toArray();
    const result = { data: fetchedexercises };

    // Convert the result object to JSON
    const json = JSON.stringify(result);

    // Send the JSON response
    res.setHeader('Content-Type', 'application/json');
    res.end(json);

}


app.use((req, res, next) => {
    const { method, originalUrl, protocol } = req;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${method} ${originalUrl} - ${protocol}://${req.get('host')}${req.originalUrl}]\n`);
    next();
});

const imageMiddleware = (req, res, next) => {
    // Assuming the image path is provided in the request URL
    const imagePath = path.join(__dirname, './images', req.params.imageName);

    // Check if the file exists
    fs.access(imagePath, fs.constants.F_OK, (error) => {
        if (error) {
            // If the file does not exist, send a 404 response
            res.status(404).send('Image not found');
        } else {
            // If the file exists, send the image as a response
            res.sendFile(imagePath);
        }
    });
};

// Define a function to handle login requests
const login = async (req, res) => {
    // Extract username and password from the request body
    const { username, password } = req.body;

    try {
        // Connect to the MongoDB database
        await client.connect();
        const db = client.db(db_name);

        // Check if the provided username and password match a user in the database
        const user = await db.collection(db_patients_collection_name).findOne({ username, password });

        if (user) {
            // If the user exists and the password matches, generate JWT token
            const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
            const result = {token}

            // Convert the result object to JSON
            const json = JSON.stringify(result);
            // Send the JSON response
            res.setHeader('Content-Type', 'application/json');
            // If the user exists and the password matches, return success response
            res.status(200).send(json);
        } else {
            // If the user doesn't exist or the password doesn't match, return error response
            res.status(401).send("Invalid username or password");
        }
    } catch (error) {
        // If any error occurs during the database operation, return error response
        console.error("Error during login:", error);
        res.status(500).send("Internal server error");
    }
};

// Define a function to handle fetching name by username
const fetchProfileByUsername = async (req, res) => {
    // Extract username from the request parameters
    const { username } = req.params;

    try {
        // Connect to the MongoDB database
        await client.connect();
        const db = client.db(db_name);

        // Find the user document with the matching username
        const fetchedName = await db.collection(db_patients_collection_name).findOne({ username });

        if (fetchedName) {
            // If the user exists, return the name associated with that username
            const result = { data: fetchedName };

            // Convert the result object to JSON
            const json = JSON.stringify(result);

            // Send the JSON response
            res.setHeader('Content-Type', 'application/json');
            res.end(json);
        } else {
            // If no user is found with the provided username, return a 404 error
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        // If any error occurs during the database operation, return a 500 error
        console.error('Error fetching name:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Define your route for fetching name by username
app.get('/fetchprofile/:username', fetchProfileByUsername);
// Define your route for handling login requests
app.post('/login', login);
//Use the imageMiddleware for a specific route
app.get('/images/:imageName', imageMiddleware);
// Define your route for getting a lesson
app.get("/exercises", fetchexercises);



//start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is listening on ${port}`);
});