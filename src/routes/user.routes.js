import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

/**
 * writing just .post(registerUser) executes registerUser method when any req in /register url.
 * But we want "jaane se pahele mujhe milke jaana" so write the middleware before the method.
*/
router.route("/register").post(
    upload.fields([
        {
            name: Avatar,
            maxCount: 1
        },
        {
            name: coverImage,
            maxCount: 1
        }
    ]),
    registerUser
);

export default router;

/**
 * 1. Modular Routing Mechanics : router.route("/register")
 * - Using router.route() allows you to declare a specific URL path exactly once, and then chain multiple different HTTP methods off of it.
 * 
 * 2. Injected Middleware: Multer's upload.fields([ { name: "avatar", maxCount: 1 }, ... ])
 * - (Note: Ensure your field property strings like "avatar" and "coverImage" are enclosed in quotation marks inside your code so they don't throw syntax errors!)
 * - By default, Express cannot parse incoming binary file data streams.
 * - To handle this, we call upload.fields(), which is a specialized Multer storage method designed to accept multiple different files coming from different form input fields simultaneously.
 * - Let's look closely at the configuration array components:
 * -- name: This string value must match the exact name attribute assigned to the input tag on your frontend user interface form (e.g., <input name="avatar" type="file" />). If these names don't match exactly, Multer will completely miss the file and ignore the incoming data.
 * -- maxCount: 1: A rigid security boundary layout. This states that a user can upload a maximum of exactly one file for this specific category. If a malicious client tries to jam a network connection by uploading 50 image assets into the profile avatar form slot at the same time, Multer will automatically intercept and block the request.
 * 
 * 3. The Execution Flow Matrix (Step-by-Step) :
 * - When a client hits your server with a POST request at https://localhost:8000/api/v1/users/register, the middleware pipeline executes in a strict layout sequence:
 * - Step A: The Middleware Interception (upload.fields)
 * -- The request enters the route and hits the Multer array filter block first.
 * -- Multer opens up the binary network stream, parses the incoming text data fields, and extracts the physical images.
 * -- It writes those files straight down into your local disk directory (./public/temp/) that you mastered in your earlier file questions.
 * -- It wraps those files into a structured object configuration and binds them directly onto the live Express req.files object.
 * - Step B: The Handshake (cb / next):
 * -- Once Multer completely finishes writing the image streams to the drive, it calls its internal next() signal under the hood. This tells Express: "My job is done, the files are locked down on disk. Pass the request forward."
 * - Step C: The Controller Destination (registerUser)
 * -- Finally, your raw registerUser controller function fires.
 * -- Because it is placed right after the middleware array, it can instantly reach out and read the file paths off of req.files.avatar[0].path smoothly, without having to write any file-parsing logic inside the controller file itself!
 */