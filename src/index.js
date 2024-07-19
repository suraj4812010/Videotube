// require("dotenv").config({path : './env'})

import dotenv from "dotenv";
import connectDB from "./db/database.js";

dotenv.config({
    path : './env'
})


connectDB();








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