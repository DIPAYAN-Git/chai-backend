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

console.log();


export default app;
// export { app }; // both same