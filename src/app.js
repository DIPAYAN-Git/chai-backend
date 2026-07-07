import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    
}))

// To read incoming JSON form payloads (e.g., raw JSON from a frontend fetch/axios call)
app.use(express.json({ limit: "16kb" }));

// 2. To read URL-encoded data (like in url searching 'dipayan dam' turns 'dipayan%20dam')
// extended: true allows you to parse nested objects
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// 3. To serve static public assets (like images, PDFs, or public files stored on your server)
app.use(express.static("public"));

app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes.js"

// router declaration
app.use("/api/v1/users", userRouter);

// https://localhost:8000/api/v1/users/register
/**
 * When a user triggers https://localhost:8000/api/v1/users/register via a POST request, Express processes the request like an assembly line:
 * - The Entry Point (app.js): The request enters app.js. Express checks your app.use() configurations.
 * - The Base Match: It sees that the incoming URL starts with /api/v1/users. It strips that base part away temporarily and passes the remaining path (/register) along with the HTTP method (POST) straight into your user.routes.js file.
 * - The Final Destructuring (user.routes.js): Inside your router file, you have your final target lines:
 * --- router.route("/register").post(registerUser);
 * - The router matches the leftover /register path and the POST method perfectly, then finally runs your wrapped controller function!
 */

export default app;
// export { app }; // both same