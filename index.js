const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
// make use of express.json() middleware: enable express to proces json request
app.use(express.json())

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
app.post('/reviews', async function(req,res){
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
app.put('/reviews/:id', async (req, res) => {
    const id = req.params.id;
    const { restaurant_name, review_text, rating } = req.body;
    const query = `UPDATE reviews 
                    SET restaurant_name = ?, review_text = ?, rating = ? WHERE id = ?`;
    await pool.execute(query, [restaurant_name, review_text, rating, id]);
    
    // by default res.send assumes status 200
    res.send('Review updated');
});

// DELETE - Delete a review
app.delete('/reviews/:id', async function(req,res){
    await pool.execute("DELETE FROM reviews WHERE id = ?", [req.params.id]);
    
    // another way to send response

    res.json({
        "success": true
    })
})

app.listen(8080, function(){
    console.log("Server has started");
})