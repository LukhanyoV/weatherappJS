const axios = require("axios")
const express = require("express")
const flash = require("express-flash")
const exphbs = require("express-handlebars")
const session = require("express-session")
const sqlite3 = require("sqlite3").verbose()

// connect to the database
const db = new sqlite3.Database(
    // file path
    './weather_data.db',
    // mode
    sqlite3.OPEN_READONLY,
    // callback
    err => {
        if (err) return console.error(err.message)
    }
)

// initialise express app
const app = express()

// setup the view engine
app.engine("handlebars", exphbs.engine({defaultLayout: "main"}))
app.set("view engine", "handlebars")

// powered by
app.use(function (req, res, next) {
    res.setHeader('X-Powered-By', 'LukhanyoV')
    next()
})

// using the middleware
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(session({
    secret: "sgoaiufgdpayhfiubasdjfhaisdh",
    resave: false,
    saveUninitialized: true
}))
app.use(flash())

// load static files
app.use(express.static("public"))


// ROUTES
// show date picker form
let url = "http://localhost:5000"
if(process.env.NODE_ENV === "production"){
    url = "https://weathertrendapp.herokuapp.com"
}

app.get("/", (req, res) => {
    res.render("index")
})

// post day picker form
app.post("/day", (req, res) => {
    const {date} = req.body
    if(!date){
        req.flash("error", "Please select a day to analyze")
        res.redirect("back")
    } else {
        res.redirect("/day/"+date)
    }
})

// post month picker form
app.post("/month", (req, res) => {
    const {date} = req.body
    if(!date){
        req.flash("error", "Please select a month to analyze")
        res.redirect("back")
    } else {
        res.redirect("/month/"+date)
    }
})

// show weather data for day
app.get("/day/:date", async (req, res) => {
    const {date} = req.params
    const {data} = await axios.get(url+"/api/day/"+date)
    res.render("dayChart", {
        elements: "temperature,wind_speed,wind_direction,precipitation,humidity,visibility,pressure,cloud_cover,dew_point,wind_gust".split(","),
        data: JSON.stringify(data)
    })
})

// show avg weather data for month
// WORKING ON THIS NOW
app.get("/month/:date", async (req, res) => {
    const {date} = req.params
    const {data} = await axios.get(url+"/api/month/"+date)
    res.render("monthChart", {
        elements: "temperature,wind_speed,wind_direction,precipitation,humidity,visibility,pressure,cloud_cover,dew_point,wind_gust".split(","),
        data: JSON.stringify(data)
    })
})

// API

// get weather data for specific day and avg value of all weather elements
app.get("/api/day/:date", async (req, res) => {
    const {date} = req.params
    const getAll = `
    SELECT * FROM (
        SELECT name, description, value, TIME(timestamp) AS time, DATE(timestamp) AS date 
        FROM data 
        INNER JOIN parameters ON data.param_id = parameters.param_id
    ) AS temp 
    WHERE date = ?`
    db.all(getAll, [date], (error, rows) => {
        res.json({
            data: rows  
        })
    })
})

// get weather data for specific month by average a month
// WORKING ON THIS NOW
app.get("/api/month/:date", async (req, res) => {
    const {date} = req.params
    const getAll = `
    SELECT name, MIN(value) AS min, MAX(value) AS max, AVG(value) AS avg, description, date FROM (
        SELECT name, description, value, TIME(timestamp) AS time, DATE(timestamp) AS date 
        FROM data 
        INNER JOIN parameters ON data.param_id = parameters.param_id
    ) AS temp 
    WHERE date >= ? AND date <= ?
    GROUP BY date, name`
    db.all(getAll, [date+"-01", date+"-31"], (error, rows) => {
        res.json({
            data: rows  
        })
    })
})

// get weather data for specific day and avg value of all weather elements
app.get("/api/:date/avg", async (req, res) => {
    const {date} = req.params
    const getAll = `
    SELECT name, description, time, date, AVG(value) as average FROM (
        SELECT name, description, value, TIME(timestamp) AS time, DATE(timestamp) AS date 
        FROM data 
        INNER JOIN parameters ON data.param_id = parameters.param_id
    ) AS temp 
    WHERE date = ?
    GROUP BY name`
    db.all(getAll, [date], (error, rows) => {
        res.json({
            data: rows  
        })
    })
})

module.exports = app

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀 App running on port: ${PORT}`))
