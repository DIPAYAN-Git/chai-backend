import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId); // user Role: It holds the data rows of exactly one unique user account
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        /*  save kicks the mongoose model that checks for pass before save but we don't have pass ("-password").so we want don't validate just save. */

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access and refresh token"
        );
    }
};

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

    const { fullName, username, email, password } = req.body;

    // console.log("req.body :", req.body);
    // console.log("email :", email);

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

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path || ""; // details in notes below

    /* classic js way of handling coverImage error is below or adv is add (?.[0]) & (|| "") */

    // let coverImageLocalPath;
    // if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    //     coverImageLocalPath = req.files.coverImage[0].path
    // }

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

const loginUser = asyncHandler(async (req, res) => {
    // get user details from req.body
    // validate - not empty - username email
    // check if registered or not
    // match password with db
    // generate access & refresh token
    // send cookies

    const { email, username, password } = req.body;
    console.log("email from req.body : ", email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(401, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid User Credintials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    /* When we initially retrieved the 'user' document using findOne in the login controller, it didn't include the refresh token value yet because that token was generated later by a specific method call in prev line. Now two options :
    1. Updating the existing object: You could manually update the current user object with the newly generated refresh token.
    2. Database query: Or, you can perform another database query (findById) to fetch the updated user document which now contains all the necessary data. */

    // Optional step send data:
    const loggedInUser = await User.findOne(user._id).select(
        "-password -refreshToken"
    );

    console.log("loggedInUser : ", loggedInUser);

    // while sending cookies we set up some options called Server-Side Cookie Hardening. By default in frontend anyone can modify cookies options prevent this, makes it only modifyable from server.
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            // imp notes below
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User loggedIn Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    // clear cookies
    // clear accessToken

    /* In logout, problem is how do I get userId? earlier in the login, user gave email password from that we searched in User. but here? if I give user a form to logout he can logout any person.
    - Now in routes after verifyJWT middleware (it adds user to req) when logoutUser executes we've req.user inside logoutUser there we can get _id */

    /* User.findById(req.user._id) in this method we've to get user, delete refreshToken in RAM, save, validateBeforeSave: false. Option 2: User.findByIdAndUpdate() */

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
            /* OR
            $unset: { refreshToken: 1 } // Removes the field value entirely from the document disk space */
        },
        {
            // new: true,
            /* to say "give me the document after it's updated", but it's depricated by MongoDB */

            returnDocument: "after", // replaces 'new: true'
        }
    );

    /* - If you want the document after the update is written: Use {returnDocument: 'after'} (Replaces new: true).
    - If you want the document before the update was written: Use {returnDocument: 'before'} (Replaces new: false). */

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User loggedOut"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used");
        }

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshTokens(user?._id);

        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "AccessToken Refreshed Successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    /* here we don't have headache isUserLoggedIn we'll handle it by jwt middleware */
    const { oldPassword, newPassword, confPassword } = req.body;

    if (newPassword !== confPassword) {
        throw new ApiError(400, "Passwords do not match");
    }

    /* user is changing pass-> user is loggedIn-> verifyJWT has ran before logIn-> inside verifyJWT user is attatched to req.body from there we can access all data */

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: req.user },
                "current user fetched successfully"
            )
        );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName && !email) {
        throw new ApiError(
            400,
            "At least one field (fullName or email) is required to update"
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email: email,
            },
        },
        {
            returnDocument: "after",
            select: "-password -refreshToken",
        }

        /* Pass `select: "-password"` directly inside the options object of findByIdAndUpdate() instead of chaining it at the end to keep the query clean and secure. */
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const oldAvatarUrl = (await User.findById(req.user?._id))?.avatar;
    let oldAvatarId = null;

    if (oldAvatarUrl) {
        try {
            const rightSide = oldAvatarUrl.split("/upload/")[1];
            if (rightSide) {
                const cleanPath = rightSide.substring(
                    rightSide.indexOf("/") + 1
                );
                oldAvatarId = cleanPath.split(".")[0];
            }
        } catch (error) {
            console.log("Couldn't parse old avatar Id");
        }
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar on cloudinary");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        {
            returnDocument: "after",
            select: "-password",
        }
    );

    if (oldAvatarId) {
        await deleteFromCloudinary(oldAvatarId);
        console.log("Old Avatar deleted successfully");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }

    const oldCoverImgUrl = (await User.findById(req.user._id))?.coverImage;
    let oldCoverImgId = null;

    if (oldCoverImgUrl) {
        try {
            const rightSide = oldCoverImgUrl.split("/upload/")[1];
            if (rightSide) {
                oldCoverImgId = rightSide
                    .substring(rightSide.indexOf("/") + 1)
                    ?.split(".")[0];
            }
        } catch (error) {
            console.log("Couldn't parse old coverImg Id");
        }
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(
            400,
            "Error while uploading cover image on cloudinary"
        );
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        {
            returnDocument: "after",
            select: "-password -refreshToken",
        }
    );

    if (oldCoverImgId) {
        await deleteFromCloudinary(oldCoverImgId);
        console.log("Old Cover Image deleted successfully");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params; // values passed directly inside the URL path itself.

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            // to find subscriber of that user
            $lookup: {
                from: "subscriptions", // The other collection to search inside
                localField: "_id", // The key inside the current collection
                foreignField: "channel", // The key inside the 'users' collection
                as: "subscribers", // The name of the new array to put the result in
            },
        },
        {
            // to find subscribed by that user
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                created_at: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "user does not exists");
    }

    console.log(channel);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "user channel fetched successfully"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
            },
            /* The reason you don't see an "_id" field defined inside your videoSchema code is because MongoDB and Mongoose automatically generate it for you behind the scenes and inject it automaticly. */

            /* sub pipeline for owner */
            pipeline: [
                {
                    $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                        /* select fields to send clean data to frontend with extra pipeline */
                        pipeline: [
                            {
                                $project: { // what if we do this filter outside? see Below.
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $addFields: {
                        owner: {
                            $first: "$owner", // $owner b/c extract from field
                        },
                    },
                },
            ],
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "watch history fetched successfully"
            )
        );
});



export {
    loginUser,
    registerUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};

/* Postman responce :
{
    "statusCode": 200,
    "data": {
        "_id": "6a4e7a6354a8989b5977df3d",
        "username": "damdipayan",
        "email": "dd@chai.com",
        "fullName": "Dipayan Dam",
        "avatar": "http://res.cloudinary.com/zbugt3dd/image/upload/v1783528033/t4ryw8czqj64hs9i526l.jpg",
        "coverImage": "http://res.cloudinary.com/zbugt3dd/image/upload/v1783528035/fgy5ldjzlu89kfkokmul.jpg",
        "watchHistory": [],
        "createdAt": "2026-07-08T16:27:15.993Z",
        "updatedAt": "2026-07-08T16:27:15.993Z",
        "__v": 0
    },
    "message": "User Registered Successfully",
    "success": true
}
 */

/**
 * Why do we need to save()? (Memory vs. Hard Drive)
 * When your code executes this line: user.refreshToken = refreshToken;
 * - You have only changed the value inside your Node.js application's temporary memory (RAM).
 * - The State right now: The local variable user sitting in your computer's RAM knows about the new token.
 * - However, your MongoDB database cluster (which lives on a completely separate hard drive server) still has the old token or an empty field.
 * The Danger: If your server crashes, or if the user makes a secondary API call a split second later, MongoDB will serve the old data because it was never notified of the change.
 * The Fix: Calling await user.save() takes that updated object from your temporary RAM, transmits it across the network connection, and overwrites the permanent record inside the MongoDB hard disk.
 *
 * Why {validateBeforeSave : false} :
 * Whenever you trigger user.save(), Mongoose initializes its Save Lifecycle Pipeline. This pipeline runs two major checkpoints back-to-back:
 * 1. It executes all schema validation checks (e.g., checking if {required: true} fields are present in user model yes -
 *       password: {type: String,required: [true, "Password is required"]}.
 * 2. It executes your pre("save") hook middleware blocks.
 * In user obj, password was explecitely removed by "-password".
 * Now if you don't use { validateBeforeSave: false } when saving token updates, Mongoose triggers the first checkpoint. password is missing or unmodified in your active query state, the execution crashes at checkpoint 1 and never even reaches your pre("save") hook!
 */

/**
 * OUTPUT OF console.log(req.body):-
 *
 *       req.body : [Object: null prototype] {
 *         fullName: 'Dipayan Dam',
 *         username: 'damdipayan',
 *         email: 'dd@chai.com',
 *         password: 'dipayan1234'
 *       }
 *
 */

/**
 * In our prev code (req.files?.coverImage[0]?.path) if a user didn't upload a cover image, req.files?.coverImage would evaluate to 'undefined'.
 * Trying to read [0] off undefined would cause a catastrophic runtime crash.
 * unlike avater we didn't want the code to give error in that case.
 *
 * 1. The Deep Optional Chaining (req.files?.coverImage?.[0]?.path)
 * - Notice the extra ?. right before the brackets: coverImage?.[0].
 * - If req.files.coverImage does not exist (it's undefined), the optional chaining instantly short-circuits.
 * - Instead of throwing a crash error, it gracefully stops executing the rest of the chain and evaluates the entire left side simply as undefined.
 * 2. The Logical OR Fallback (|| "")
 * - Now your variable looks like this behind the scenes:
 * --- const coverImageLocalPath = undefined || "";
 * - In JavaScript, undefined is a falsy value.
 * - This assigns a clean, empty string ("") to coverImageLocalPath.
 */

/**
 * OUTPUT OF console.log(req.files):-
 *
 *       [Object: null prototype] {
 *       avatar: [
 *         {
 *           fieldname: 'avatar',
 *           originalname: '20241204_182725 (1).jpg',
 *           encoding: '7bit',
 *           mimetype: 'image/jpeg',
 *           path: 'public/temp/20241204_182725 (1).jpg',
 *           destination: './public/temp',
 *           filename: '20241204_182725 (1).jpg',
 *           size: 1449039
 *         }
 *       ],
 *       coverImage: [
 *         {
 *           fieldname: 'coverImage',
 *           originalname: 'myntra-banner.jpeg',
 *           encoding: '7bit',
 *           mimetype: 'image/jpeg',
 *           path: 'public/temp/myntra-banner.jpeg',
 *           destination: './public/temp',
 *           filename: 'myntra-banner.jpeg',
 *           size: 39826
 *         }
 *       ]
 *
 */

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

/**
 * Setting the Cookies Natively
 *
 *      return res
 *      .status(200)
 *      .cookie("accessToken", accessToken, options)
 *      .cookie("refreshToken", refreshToken, options)
 * - res.status(200): Initializes the response package header, marking the transaction state as a successful 200 OK.
 * - .cookie("key", value, options): Instructs Express to construct an explicit Set-Cookie header inside the incoming network response payload. It binds the key identifier name, passes the encrypted string value generated by your database tokens utility, and locks down the security behavior configurations using your options rules.
 * - The Multiple Call Chain: Express executes the method twice, appending two separate Set-Cookie directives into the identical network trip—one containing the short-lived accessToken (used for authorization access blocks) and one holding the long-lived refreshToken (used to request new keys when the access token expires).
 *
 * Injecting the Standard JSON Payload (.json(...)) :
 *
 * This is where you pass the actual data back into the hands of the frontend developer.
 * - new ApiResponse(...): Instead of dumping raw, disorganized data rows, you instantiate your standardized, custom response class template. This ensures that every successful API response across your entire application has the exact same structural layout { statusCode, data, message, success }.
 * - The Data Object Payload: Inside the data parameter slot, you pass a compound JavaScript object using shorthand notation:
 *      { user: loggedInUser, accessToken, refreshToken }
 * This delivers three vital pieces of information to the frontend application:
 * - user: loggedInUser: The full profile information of the person who just logged in (with their password and refresh tokens securely stripped out via your .select("-password") rule!). The frontend needs this data to display their profile picture, name, and bio on the screen.
 * - accessToken & refreshToken: Sending copies of the tokens directly in the JSON data payload gives the frontend architecture maximum flexibility. If you build a mobile application later (where standard browser cookies don't exist natively), the mobile app can read these tokens right out of the JSON data object and store them inside secure mobile device storage manually.
 */

/* LogOutUser Notes : 
1. The Strategy: findById vs. findByIdAndUpdate

Option A: Use User.findById(), modify the refreshToken property in RAM, and then run user.save({ validateBeforeSave: false }).

Option B: Use User.findByIdAndUpdate() to perform the action in a single step.
- Your choice to use User.findByIdAndUpdate() is excellent. It is highly optimized because it sends a single update command directly to MongoDB. It completely bypasses your Mongoose data-hydration layer and your pre("save") password-hashing hook, meaning you don't even have to worry about validateBeforeSave: false flags or race conditions!

2. Deep Dive Into the Update Object Matrix
Let's look closely at the configuration fields you passed to MongoDB:

    User.findByIdAndUpdate(
        req.user._id, // 1. The Target Selector
        {
            $set: {
                refreshToken: undefined // 2. The Operational Trick
            }
        },
        {
            new: true // 3. The Options Block
        }
    )
A. The Target Selector (req.user._id)
Thanks to your verifyJWT middleware running right before this controller, the user's verified database ID is already securely sitting inside req.user._id. There is zero risk of an IDOR security vulnerability where one user logs out another.

B. The Operator ($set vs $unset)
In your code, you wrote refreshToken: undefined. When Mongoose translates undefined inside a $set operator, it tells MongoDB to wipe out the value of that field inside the database document.

While this works perfectly in Mongoose, the official, rock-solid MongoDB production standard to completely remove a field value is using the $unset operator:

JavaScript
{
    $unset: {
        refreshToken: 1 // Removes the field value entirely from the document disk space
    }
}
C. The Query Option {new: true} (Old depricated)
- By default, MongoDB update methods return the document before the changes were applied. Passing { new: true } instructs the engine to return the freshly modified, token-free document back to your JavaScript runtime variable instead.
- 📌 MONGOOSE DEPRECATION WARNING ({ new: true } vs. { returnDocument: 'after' }):
    -- If you want the document after the update is written: Use {returnDocument: 'after'} (Replaces new: true).
    -- If you want the document before the update was written: Use {returnDocument: 'before'} (Replaces new: false).

 */

/** Agreegation Pipeline (You Need to Know Before Starting)
 * 1. $match :
 * - What it does: It filters your documents. It acts exactly like a regular .find(). If a document doesn't match your criteria, it gets thrown off the conveyor belt immediately.
 * - Why we use it: To ensure the rest of the factory isn't wasting time processing data we don't need.
 *
 * 2. $project :
 * - What it does: It selects, renames, or creates new fields while throwing away the fields you don't care about.
 * - Why we use it: To shrink heavy documents down to a clean, lightweight object before sending it to the frontend.
 *
 * 3. $group :
 * - What it does: It bundles documents together based on a shared value (like grouping users by their city, or orders by their product ID) and calculates totals.
 * - Crucial Rule: It always requires an _id field to know what it is grouping by, and it usually uses accumulator operators like $sum or $avg.
 *      {
 *        $group: {
 *          _id: "$city", // Group everyone by their city
 *          totalUsers: { $sum: 1 }, // Count how many users are in each city
 *          averageAge: { $avg: "$age" } // Calculate the average age per city
 *        }
 *      }
 *
 * 4. $lookup :
 * - What it does: It goes into a completely different collection, finds documents that match an ID, and embeds them directly into the current document as an array.
 * - Why we use it: MongoDB is non-relational, but sometimes we need to bridge two tables together.
 *      {
 *        $lookup: {
 *          from: "users",         // The other collection to search inside
 *          localField: "authorId", // The key inside the current collection
 *          foreignField: "_id",    // The key inside the 'users' collection
 *          as: "authorDetails"     // The name of the new array to put the result in
 *        }
 *      } */

/** getUserChannelProfile (Step-by-Step Pipeline Breakdown) :
 *
 * This specific controller fetches the "Channel Profile" dashboard. It doesn't just grab basic user info—it dynamically calculates their subscriber count, how many people they follow, and checks if the currently logged-in user is subscribed to them.
 *
 * Part 1: The Express Setup Layer
 *
 *      const { username } = req.params;
 *      if (!username?.trim()) {
 *           throw new ApiError(400, "username is missing");
 *      }
 * - What it does: It plucks the username directly out of the URL path (e.g., /api/v1/c/hiteshchoudhary).
 * - Why .trim() matters: It ensures that if someone sends trailing blank spaces (like ?username=hitesh  ), the spaces are wiped out so it doesn't break our database lookup query matching criteria.
 *
 * Part 2: The Aggregation Factory Assembly Line
 * Now, your data drops into User.aggregate([]). Remember our conveyor belt analogy? MongoDB matches your document and sends it down the pipeline step by step.
 * - Stage 1: $match (The Entry Bouncer)
 *
 *      {
 *          $match: {
 *              username: username?.toLowerCase(),
 *          },
 *      }
 * -- How it works: It goes into your main users collection and pulls out the one single document where the username matches the requested string (lowercased for system consistency).
 * -- Conveyor belt status: All other millions of users are thrown off the belt. Only the target channel user's document moves forward to Stage 2.
 *
 * - Stage 2: The First $lookup (Counting Incoming Subscribers)
 *
 *      {
 *          $lookup: {
 *              from: "subscriptions",
 *              localField: "_id",
 *              foreignField: "channel",
 *              as: "subscribers",
 *          },
 *      }
 * -- How it works: MongoDB leaves the users collection for a moment and hops into the subscriptions collection. It looks for every single subscription record where the channel ID matches our target user's _id.
 * -- Conveyor belt status: It grabs all matching rows and embeds them directly onto our moving document inside a brand new array called "subscribers".
 *
 * - Stage 3: The Second $lookup (Counting Outgoing Subscriptions)
 *
 *      {
 *          $lookup: {
 *              from: "subscriptions",
 *              localField: "_id",
 *              foreignField: "subscriber",
 *              as: "subscribedTo",
 *          },
 *      }
 * -- How it works: It hops right back into the subscriptions collection, but checks a different field. It looks for rows where this channel user is listed as the subscriber (who they are following).
 * -- Conveyor belt status: It embeds those matches into another new array field called "subscribedTo".
 *
 * - Stage 4: $addFields (The Calculator Machine)
 * - This is an incredibly powerful stage. It takes the heavy array payloads we imported in Stages 2 and 3 and condenses them into useful metrics on the fly.
 *      {
 *          $addFields: {
 *              subscriberCount: { $size: "$subscribers" },
 *              channelsSubscribedToCount: { $size: "$subscribedTo" },
 *
 *              isSubscribed: {
 *                  $cond: {
 *                      if: { $in: [req.user?._id, "$subscribers.subscriber"] },
 *                      then: true,
 *                      else: false,
 *                  },
 *              },
 *          },
 *      }
 * - $size: Instead of passing thousands of heavy subscription documents to the client, it just counts the array elements using $size and creates a single integer property (subscriberCount).
 * - The $cond (Condition) Rule: This calculates a true/false status for the logged-in user. It looks inside the subscribers list, maps all the subscriber fields out, and checks: "Is the currently logged-in user's ID (req.user._id) found inside this channel's subscriber list?"
 * -- If Yes (then), it appends isSubscribed: true.
 * -- If No (else), it appends isSubscribed: false. This dictates whether the frontend displays a red "Subscribe" or grey "Unsubscribe" action button template layout!
 *
 * - Stage 5: $project (The Cleaner/Filter Machine)
 *
 *      {
 *          $project: {
 *              fullName: 1,
 *              username: 1,
 *              // ... list of fields set to 1 ...
 *          }
 *      }
 * -- How it works: Now that all the math calculations are finished, we have massive arrays (subscribers and subscribedTo) cluttering up our document structure.
 * -- Conveyor belt status: $project sweeps through, selects only the safe fields explicitly marked with a 1, and throws away the raw heavy data array blocks. The document is now light, clean, and safe for the public internet pipeline.
 *
 * Part 3: Wrapping Up the Request
 *
 *      if (!channel?.length) {
 *          throw new ApiError(404, "user does not exist");
 *      }
 *
 *      return res
 *     .status(200)
 *     .json(new ApiResponse(200, channel[0], "user channel fetched successfully"));
 *
 * Why channel[0]? MongoDB aggregate queries always return an array, even if they only found one matching document. Since we are looking up a unique username, the array will only contain one item. Writing channel[0] strips off the outer array bracket container so the frontend receives a clean, single JSON user object instead of a one-element list.
 */


/** getWatchHistory (Step-by-Step Pipeline Breakdown) :
 * 
 * Stage 1: $match (Isolating the User)
 * 
 *      {
 *          $match: {
 *              _id: new mongoose.Types.ObjectId(req.user._id)
 *          }
 *      }
 * 
 * - What it does: It grabs the document of the currently logged-in user.
 * - Why "new mongoose.Types.ObjectId()" is used : In standard Mongoose commands (like findById), Mongoose automatically converts string IDs (5d6ede6a0ba62570afcedd3a) into MongoDB ObjectIds (ObjectId('5d6ede6a0ba62570afcedd3a')).
 * - However, inside an aggregation pipeline, it will not do this for you. You must manually wrap the string ID in ObjectId(), or the query will silently fail to match anything.
 * 
 * Stage 2: The Outer $lookup (Populating the Videos)
 * 
 *      {
 *          $lookup: {
 *              from: "videos",
 *              localField: "watchHistory",  // Array of Video ObjectIds in the user model
 *              foreignField: "_id",
 *              as: "watchHistory",     // Overwrites the ID array with full video objects
 *              pipeline: [ ... ]       // Sub-pipeline running INSIDE the video data!
 *          }
 *      }
 * 
 * - What it does: The user document has a field called watchHistory, which is an array of video IDs: [ id1, id2, id3 ]. This stage travels to the videos collection and swaps those plain IDs for the full details of each video (title, duration, description, etc.).
 * - The Overwrite Trick: By setting as: "watchHistory", it overwrites the original simple array of IDs with the newly fetched array of comprehensive video documents.
 * - The pipeline Option: Instead of just bringing back raw video documents, we attach a custom sub-pipeline array right inside this lookup. This runs modifications on the video items themselves before they are joined to the user. We can write it outside also see at the last...
 * 
 * Stage 3: The Sub-Pipeline Layer (Inside the Videos)
 * - Now we are running logic inside the array of videos that we are fetching.
 * 
 * - Sub-Stage A: The Inner $lookup (Fetching the Video Creator)
 * 
 *      {
 *          $lookup: {
 *              from: "users",
 *              localField: "owner",       // The creator's ID inside the video document
 *              foreignField: "_id",
 *              as: "owner",               // Overwrites the owner field with user details
 *              pipeline: [
 *                  {
 *                      $project: { fullName: 1, username: 1, avatar: 1 } // Security clean up
 *                  }
 *              ]
 *          }
 *      }
 * -- What it does: For every video found in the history list, it looks at its owner field (the creator's ID) and goes back to the users collection to find their profile.
 * -- The Security Filter: It passes a mini $project stage inside this inner lookup. This ensures we only pull the creator's fullName, username, and avatar. We safely filter out their private password hashes, refresh tokens, and email addresses.
 * 
 * - Sub-Stage B: $addFields with $first (Flattening the Array)
 *      {
 *          $addFields: {
 *              owner: {
 *                  $first: "$owner"
 *              }
 *          }
 *      }
 * -- Why this is necessary: Like we discovered earlier, all $lookup operations return an array, even if they only find one match. Without this stage, each video's owner field would look like this: owner: [{ username: "hitesh", ... }] (an array containing one object).
 * -- What it does: Takes the first obj inside the array and Overwrites into owner again. The $first operator extracts the first element out of that array container($owner). This flattens the property down to a clean object layout: owner: { username: "hitesh", ... }, which is exactly what a frontend application expects.
 * 
 * Part 4: The Final Return Payload
 * 
 *      return res
 *          .status(200)
 *          .json(
 *              new ApiResponse(
 *                  200,
 *                  user[0].watchHistory, // 💡 Notice what is being sent here!
 *                  "Watch history fetched successfully"
 *              )
 *          )
 * -- user[0]: The pipeline outputs an array containing our single user document. We access it via index 0.
 * -- user[0].watchHistory: Instead of sending the entire user document (including their username, email, etc.) back to the client, we dig right into the object and only send the watchHistory array as the final JSON payload.
 * 
 * <------------------------------ ------------------------------>
 * 
 * Writing the $project stage 'inside the owner sub-pipeline' vs. writing it 'outside in the main pipeline' completely changes how data moves through the database engine. Both options work, but they create entirely different data structures along the way.
 * 
 * Scenario A: Writing it INSIDE the owner Sub-Pipeline (What your code does)
 * - When you write the projection inside the sub-pipeline, it executes at the exact moment MongoDB pulls data out of the users collection, before it finishes the lookup join.
 * 
 *      $lookup: {
 *          from: "users",
 *          localField: "owner",
 *          foreignField: "_id",
 *          as: "owner",
 *          pipeline: [
 *              {
 *                  $project: { fullName: 1, username: 1, avatar: 1 } // ⚡ Filter immediately at the source
 *              }
 *          ]
 *      }
 * 
 * - The Conveyor Belt Layout:
 * -- MongoDB hops over to the users collection to find the video owner.
 * -- It pulls the user document, but immediately drops the password, email, and refresh tokens right there at the user collection station.
 * -- It packages only the clean fields (fullName, username, avatar) into an object and hands it back to the video document.
 * 
 * - The Document Shape immediately after this lookup:
 * 
 *      {
 *          title: "Learning Node.js",
 *          videoFile: "...",
 *          owner: [  // Array of clean objects
 *              {
 *                  fullName: "Hitesh Choudhary",
 *                  username: "hiteshchoudhary",
 *                  avatar: "..."
 *              }
 *          ]
 *      }
 * 
 * Scenario B: Writing it OUTSIDE in the Main Pipeline
 * 
 * - What happens if you delete the inner pipeline block completely, let the $lookup bring back everything, and try to filter the fields later at the very end of your main query?
 * - after the lookup has completed and joined everything filter like this ...
 * 
 * {
 *     $project: {
 *         // We are at the root user level now, so we have to use dot-notation
 *         "watchHistory.title": 1,
 *         "watchHistory.videoFile": 1,
 *         "watchHistory.owner.fullName": 1,
 *         "watchHistory.owner.username": 1,
 *         "watchHistory.owner.avatar": 1
 *     }
 * }
 * 
 * Why doing this (outside) introduces friction and vulnerabilities:
 * 
 * - 1. The Security Hazard (Leaking Sensitive Data in Transit)
 * -- Inside the database engine, when MongoDB performs the lookup join, it maps the entire raw user document—including your hashed password strings and private active refresh tokens—and carries that heavy payload across the network into the video document structure array. Even if you strip it out at the final main stage, that private data was temporarily exposed and floating around in your active database memory workspace.
 * 
 * - 2. Dotted Path Madness
 * -- Because you are working from the main root level of the query, you cannot just write fullName: 1. You have to use extensive dotted string paths ("watchHistory.owner.fullName") to target fields buried deep inside nested arrays. This makes your code long, messy, and significantly harder to maintain as your models grow.
 * - 3. RAM Performance Bottlenecks
 * -- Bringing massive, unindexed fields (like heavy user tokens or history matrices) across a database join requires significant server memory footprint layouts. Filtering early inside the sub-pipeline keeps your working datasets lightweight and highly performant.
 * 
 * Summary Cheat Sheet
 * - Filter Inside: Keeps data secure, keeps your data streams lightweight in memory, and makes your code cleaner by keeping the projection logic contextual to the collection it belongs to.
 * - Filter Outside: Forces the database to carry heavy, sensitive data payload structures all the way to the end of the line, creating complex dotted notation paths at the root stage.
 * 
 */

