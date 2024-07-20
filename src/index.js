// require("dotenv").config({path : './env'})

import dotenv from "dotenv";
import connectDB from "./db/database.js";
import { app } from "./app.js";

dotenv.config({
    path : './env'
})



connectDB()
.then(()=>{
    app.listen(process.env.PORT , () => {
        console.log(`⚙️  Server running at PORT : ${process.env.PORT}`)
    })
})
.catch((error) => {
    console.log("MongoDB Connection Failed !!!", error)
})








/*
import express from "express";
const app = express();
( async () => {
    try {
       await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error" , (error) => {
            console.log("Error :" , error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on PORT ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("DB CONNECTION ISSUE! ");
        console.log(error);
        throw error
    }
})()
*/