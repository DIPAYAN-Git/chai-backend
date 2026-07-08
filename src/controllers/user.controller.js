import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fileName, username, email, password } = req.body;
    console.log(email);

    /* Beginer's method: check if cond for all fields

    if(fullname === "") {
        throw new ApiError(400, "fullname is required")
    }
    */

    /* Advanced professional: In a single check across all of them simultaneously */

    if (
        [fullName, username, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "all fields required");
    }

    /* 
    - This block of code below checks whether a user attempting to register already exists in your MongoDB database before saving them.
    - Inside findOne {email} directly can be given, but use advanced method do all once
    */
    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "user with username or email already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // console.log(req.files);
    // console.log(req.files?.avatar[0]?.path);

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res
        .status(201) // this status shows up in the postman status code
        .json(
            new ApiResponse(200, createdUser, "User Registered Successfully")
        );
});

export { registerUser };

/**
 * {
 * ".some()" is a native JavaScript higher-order array method. It loops through your array and tests whether at least one element passes the condition you write inside the callback function.
 * - It returns true the exact millisecond it finds a single field that matches the bad condition.
 * - It returns false only if every single field in the array is perfectly valid.
 *
 * "field?" (Optional Chaining): This is a safety measure. If a malicious user or broken frontend submits a request where one of the fields is completely missing (meaning the variable evaluates to undefined or null), calling a string method like .trim() would instantly crash your entire server with a TypeError. The ? tells JavaScript: "Only try to run .trim() if the field actually exists. If it's undefined, stop here and evaluate as undefined."
 * }
 *
 * {
 * To check both (username & email already exist or not) conditions in one go, the code uses MongoDB’s native logical operator: "$or".
 * The $or operator takes an array of condition objects. MongoDB scans the collection and returns the document if at least one of these criteria is met:
 * - The document's username matches the incoming registration string.
 * - The document's email matches the incoming registration string.
 * By grouping these parameters under an array via $or, you query the database exactly once.
 * 2. (findOne):
 * - Because we are using findOne(), MongoDB will search until it finds the very first matching record that satisfies either criteria and stops searching immediately.
 * - If a match is found: existedUser becomes a populated JavaScript object containing that user's existing database values.
 * - If no match is found: existedUser evaluates to null.
 * }
 *
 * {
 * req.files: This is a master JavaScript object holding arrays of your uploaded fields. Under the hood, Multer designs its structure to look exactly like this:
 * JSON
 *      {
 *        "avatar": [
 *          { "path": "./public/temp/avatar.png", "originalname": "profile.png", ... }
 *        ],
 *        "coverImage": [
 *          { "path": "./public/temp/banner.jpeg", "originalname": "cover.jpeg", ... }
 *        ]
 *      }
 * 
 * ?. (Optional Chaining): This is an absolute lifesaver for backend safety. If a user registers but skips uploading a coverImage completely, req.files.coverImage will evaluate to undefined. Without the ?, trying to read the first index ([0]) of an undefined variable would throw a massive TypeError and instantly crash your server runtime. The ?. tells JavaScript: "Only proceed forward if the previous key actually exists."
 * [0]: Because Multer formats each field as an array (allowing multiple files per field), we grab the very first file item uploaded to that input field slot using index position 0.
 * .path: This extracts the local directory string where Multer’s disk storage just dropped the incoming file asset (e.g., "public/temp/avatar.png").
 * }
 * 

/** 
 * {
 * When User.create finishes running, it returns a document instance containing everything that was just committed to the database—including the hashed password string.
 * You should never pass a user's password hash back over the network in an API response, even if it is encrypted. If an unauthorized entity intercepts the network traffic, it creates a severe security risk.
 * 
 * When you execute User.findById(user._id), Mongoose goes to your MongoDB database and looks up a single document matching that unique identifier.
 * - 1. Case A: A Match is Found :
 * --- Returns a fully hydrated Mongoose Document Object.
 * --- This is not a simple, plain JavaScript object. It is a highly specialized object that contains: Your Schema Data: All the fields defined in your model (_id, username, email, createdAt, etc.).
 * What it looks like inside your code variable:
 *      {
 *        _id: new ObjectId('65e8a1f...'),
 *        username: 'dipayan',
 *        email: 'd@gmail.com',
 *        fullName: 'Dipayan Dam',
 *        createdAt: 2026-07-08T12:00:00.000Z,
 *        __v: 0,
 *        // + Hidden Mongoose tracking properties inside its prototype chain!
 *      }
 * - 2. Case B: No Match is Found (Returns null)
 * 
 * By appending .select("-password -refreshToken") to your query, you tell MongoDB:
 * "Go fetch that brand-new user record by its unique ID, but strip away the password field and the refreshToken field entirely from the final object before handing it back to my Node.js code."
 * The minus sign (-) before a field name triggers an 'exclusion projection' in MongoDB.
 * }
*/
