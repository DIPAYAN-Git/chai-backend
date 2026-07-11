// require("dotenv").config({port: "./env"});
import dotenv from "dotenv";
dotenv.config({port: "./.env"});

import connectDB from "./db/index.js";
import app from "./app.js";

const port = process.env.PORT || 8000;

connectDB()
.then(() => {
    app.on('error',(error) => {
        console.log(`App on ERROR: `,error);
        throw error;
    }) 

    app.listen(port,() => {
        console.log(`⚙️  Server is running at port : ${port}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection error !!!",err);
})





/*
// first approach (not professional)

import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";

import express from "express";
const app = express();


//  * The leading semicolon is a defensive programming pattern. In JavaScript, semicolons are technically optional because of Automatic Semicolon Insertion (ASI). 
//  * However, if the file or module imported right before this line forgot its closing semicolon, JavaScript might try to merge your IIFE with that file's last line, causing a catastrophic TypeError. Putting a ; here stops that error entirely.
//  * IIFE (() => {})()


;( async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        // This line combines your cluster connection URL with the specific database name.
        // The resulting connectionInstance contains rich metadata about your cluster.

        console.log(`\nMongoDB connected !! connectionInstance Object: `,connectionInstance);

        console.log(`\nMongoDB connected !! DB connection : `,(connectionInstance).connection);

        console.log(`\nMongoDB connected !! DB name : `,(connectionInstance).connection.name);
        console.log(`\nMongoDB connected !! DB Port : `,(connectionInstance).connection.port);
        console.log(`\nMongoDB connected !! DB Host : `,(connectionInstance).connection.host);
        
        // Printing connectionInstance.connection.host lets you see precisely which distributed database node responded to your request.

        // app.on("error",func) ensures that even if the database connects successfully, if the Express application itself fails to bind or run later on due to an internal glitch, it captures that specific error safely.

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

/**
 * throw :
 * - throw is a core JavaScript language feature used to handle operational errors. When you throw an error, you are raising a red flag inside your code execution.
 * How it behaves:
 * - It immediately stops the execution of the current function block.
 * - It looks for the nearest try...catch block up the call stack to see if someone handles it.
 * - If a catch block is found, the program recovers, and execution continues normally after that block.
 * - If NO catch block is found (Unhandled Exception): The error bubbles all the way to the top of the application wrapper, printing a stack trace, and ultimately crashing the Node.js process.
 * ---------------------
 * 
 * exit() :
 * - process.exit() is a environment-specific function provided by Node.js.
 * - It does not care about your JavaScript syntax, functions, or try...catch wrappers.
 * - It communicates directly with your computer's Operating System (OS).
 * How it behaves:
 * - It instantly terminates the entire Node.js runtime process.
 * - No further code in your file will execute. Asynchronous operations, pending database queries, and active web requests are immediately cut off.
 * - It accepts an optional integer argument called an Exit Code:
 * --- process.exit(0): Success/Clean Exit. Tells the OS that the script did its job and shut down intentionally (e.g., a database migration script finishing successfully).
 * --- process.exit(1) (or any non-zero number): Failure Exit. Tells the OS that the script crashed unexpectedly.

*/