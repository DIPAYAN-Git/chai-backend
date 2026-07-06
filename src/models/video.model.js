import mongoose, {model, Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema = new Schema(
    {
        videoFile: {
            type: String, // cloudinary url
            required: true,
        },
        thumbnail: {
            type: String, // cloudinary url
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        duration: {
            type: Number, // after upload cloudinary also gives time
            required: true,
        },
        views: {
            type: Number,
            default: 0 
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        Owner: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true,
        }
    },
    {
        timestamps: true
    }
)



export const Video = mongoose.model("Video", videoSchema);