import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema (
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true // expensive, but it optimises the search operation
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String, // cloudinarty url
            required: true
        },
        coverImage: {
            type: String, // cloudinary url
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function () { // No 'next' parameter needed!
    if(!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
    // next(); // in newer versions of mongodb no need to return next or call next in async fxn. writing it will give error.
})

/* Custom Instance Method : When you attach a function to userSchema.methods, you are adding a custom function directly onto the prototype chain of every individual user document instance fetched from MongoDB. */

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User",userSchema);