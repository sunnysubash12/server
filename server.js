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

const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

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



// Use the imageMiddleware for a specific route
// app.get('/images/:imageName', imageMiddleware);
// app.post("/orders", insertorders);
// app.put("/lessons/:id", putLessonAvailability);
// Define your route for getting a lesson
app.get("/exercises", fetchexercises);
// app.get("/orders", fetchOrders);

//start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is listening on ${port}`);
});