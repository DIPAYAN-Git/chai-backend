// require("dotenv").config({port: "./env"});
import dotenv from "dotenv";
dotenv.config({port: "./env"});

import connectDB from "./db/index.js";

connectDB();






/*
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";

import express from "express";
const app = express();

;( async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("MongoDB connected !! DB Host: ",connectionInstance);
        console.log("MongoDB connected !! DB Host: ",connectionInstance.connection.host);
        console.log("MongoDB connected !! DB Host: ",connectionInstance.connection.name);
        console.log("MongoDB connected !! DB Host: ",connectionInstance.connection.port);
        
        app.on("error",(error) => {
            console.log("App on ERROR: ",error);
            throw error;
        })
        app.listen(process.env.PORT || 4000, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("MongoDB connection failed Error: ",error);
        throw error;
        process.exit(1);
    }
})()
*/