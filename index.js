const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
// make use of express.json() middleware: enable express to proces json request
app.use(express.json())

// generate jwt: when the user log in, we want to give them a token
function generateToken(userId, role) {
    // first argument: your payload (what do you want to store in the jwt)
    // second argument: JWT_SECRET
    // third argument: expiry and other options
    return jwt.sign({
        id: userId, role: role
    }, process.env.JWT_SECRET,{
        expiresIn:'1h'  // unit of measure: h = hours, m = minutes, d = days, w = weeks, s = seconds
    });
}

// verify token: whe the user requests for a protected route
// we check if the token is valid
// if a function signature is (req,res,next) it is a middleware
function verifyToken(req, res, next) {
    // 1. extract the authorization from the request
    // the JWT will be inside the authorization header
    const token = req.headers.authorization.split(" ")[1];

    // verify the token is valid
    jwt.verify(token, process.env.JWT_SECRET, function(err, payload){
        if (err) {
            res.status(401).send("Failed authorization");
            return; // stop execution
        }

        // if no error
        // store in the request the user id and the role
        // routes will be able to access req.userId and req.role later
        req.userId = payload.id;
        req.role = payload.role;
        next(); // transfer the control to the next middleware !important
    })
}

// we assume verifyToken has been called on the request
function checkRole(roles) {
    return function(req,res,next) {
        // includes functione exists on array
        // [1,2,3].includes(2) ==> true
        // [1,2,3].includes(-99) ==> false
        if (roles.includes(req.role)) {
            next();
        } else {
            return res.status(403).send("Permission denied");
        }
    }
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit:10,
    queueLimit: 0
});

app.get('/', function(req,res){
    res.send("hello world");
})

// GET /reviews
app.get('/reviews', async function(req,res){
    const [results] = await pool.execute("SELECT * FROM reviews");
    res.json(results);
})

// CREATE a new review
// POST /reviews
// body:
//  - restaurant_name : String
//  - review_text : String
//  - rating : float
app.post('/reviews', verifyToken, async function(req,res){
    const query = `INSERT INTO reviews (restaurant_name, review_text, rating)
       VALUES (?, ?, ?)`;
    await pool.execute(query, [
        req.body.restaurant_name,
        req.body.review_text,
        req.body.rating
    ]);
    res.status(201).send('Review added');
})

// PUT - Update a review
// body:
// - restaurant_name
// - review_text
// - rating
app.put('/reviews/:id', [verifyToken, checkRole(["admin", "editor"])], async function(req,res){


    const {restaurant_name, review_text, rating} = req.body;
    await pool.execute(`UPDATE reviews
        SET restaurant_name = ?,
            review_text = ?,
            rating = ?
        WHERE id = ?
    `, [restaurant_name, review_text, rating, req.params.id]);

    // by default res.send and res.json assumes status 200
    res.json({
        "success": true,
    })
})


// DELETE - Delete a review
app.delete('/reviews/:id', async function(req,res){
    await pool.execute("DELETE FROM reviews WHERE id = ?", [req.params.id]);
    
    // another way to send response

    res.json({
        "success": true
    })
})



// log in
// - body
//   - username: username of the user
//   - password: password of the user
app.post('/login', async function(req,res){
    const { username, password} = req.body;
    const query = "SELECT * FROM users WHERE username=?";
    const [results] = await pool.execute(query, [username]);
    const user = results[0];
    // check if the user with the given username exists
    if (user && user.password == password) {
        // save to the JWT payload the id and the role of the user
        const token = generateToken(user.id, user.role);
        res.json({
            token
        })
    } else {
        res.sendStatus(401);
    }
})

app.listen(8080, function(){
    console.log("Server has started");
})