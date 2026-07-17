import mongoose, { model, Schema } from "mongoose";

const playlistSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        owner: {
            type: mongoose.Types.ObjectId,
            ref: "User",
        },
        videos: [
            {
                type: mongoose.Types.ObjectId,
                ref: "Video"
            }
        ],
    },
    { timestamps: true }
);

export const Playlist = new mongoose.model("Playlist", playlistSchema);
