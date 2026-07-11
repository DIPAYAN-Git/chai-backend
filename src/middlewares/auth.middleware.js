import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

/* It will only verify if user exists or not
Strategy is to verify access & refresh tokens to verify true login and add a new obj into req req.user just like req.body, req.cookie. */

export const verifyJWT = asyncHandler(async (req, _, next) => { // here res was written but not used anywhere can be replaced by '_' in production codes
    try {
        /* Now how to get access of tokens? Thanks to your cookie-parser middleware initialized in your main app.js file, Express parses those cookies and attaches them to req.cookies. */

        // console.log(req.cookies);
        // console.log(req.header("Authorization"));
        
        const token = req.cookies?.accessToken || (req.header("Authorization")?.replace("Bearer ", ""));

        console.log("Token : ", token);
        
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        /* now usging jwt verify is token correct? if yes then decode & extract data from token that we've encrypted in user model { _id: .., email: .., username: .., fullName: .. }. To decode it we need security key */

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        console.log("decodedToken : ", decodedToken);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        console.log("user from decodedToken :", user);

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});

/* In this step, you are building your Authentication Guardrail (Middleware). The goal of this middleware is to intercept an incoming request, verify that the person is logged in, and then let them pass to private routes (like logging out or changing their avatar).

Let's look at exactly how we grab that token from the request object and why we use this specific code strategy.

1. How to get access to the token (The Code)
To read cookies from an incoming request in Express, you need to check both req.cookies (populated by the cookie-parser middleware) and the fallback HTTP Authorization header (which mobile apps or desktop clients use).

const token = req.cookies?.AccessToken || req.header("Authorization")?.replace("Bearer ", "");

2. Breaking Down the Extraction Mechanics :
Let's dissect this single line to see how it catches the token from any frontend client:

- Part A: The Cookie Read (req.cookies?.AccessToken)
-- How it works: When a standard browser makes an API request to your backend, it automatically brings along any secure cookies it has stored. Thanks to your cookie-parser middleware initialized in your main app.js file, Express parses those cookies and attaches them to req.cookies.
-- Optional check: "req.cookies?" in mobile application may be cookies is not there may be user is sending custom cookies
-- The Key: "AccessToken" must match the exact case-sensitive name string you used when you baked the cookie inside your login controller.

- Part B: The Header Fallback (req.header("Authorization")...)
-- Why it's there: What if you build a mobile app or a frontend developer uses tools like Axios or Postman and decides to pass the token manually inside the headers instead of a cookie?
-- The Format: Secure tokens sent via headers are traditionally formatted as a Bearer token: Bearer eyJhbGciOi....
-- .replace("Bearer ", ""): This method takes that header string, slices off the word "Bearer " and the empty space, leaving you with just the raw, clean JWT cryptographic string.

3. Why do we extract it this way? (The Backend Strategy) :
- A. To Verify the Identity (The "Who are you?" phase)
Once you have this raw token string, you will pass it to jwt.verify(token, process.env.ACCESS_TOKEN_SECRET). This decodes the encrypted string to give you back the user's database _id.
- B. To Hydrate req.user
After extracting the _id and confirming the token hasn't expired, you will run a quick database check:
    const user = await User.findById(decodedToken._id).select("-password -refreshToken");
** Once found, you attach that database document straight onto the live request object:
    req.user = user;

C. The Ultimate Goal :
By attaching the user object to req.user right here inside the middleware and calling next(), your subsequent controller functions (like your logout controller) don't have to guess or ask the frontend for a user identity form anymore. They can simply reach into req.user to handle private user details safely!

// Inside your next controller (e.g., logoutUser)
// Because of verifyJWT, this is now populated automatically:
const identity = req.user._id; */
