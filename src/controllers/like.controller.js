import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


// Toggle video likes
const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400, "VideoId is not valid")
    }

    const existingLikeStatus = await Like.findOne(
        {
            video: new mongoose.Types.ObjectId(videoId),
            likedBy: new mongoose.Types.ObjectId(req.user?._id), 
        }
    );

    // if already liked
    if(existingLikeStatus){
         // remove likes
         const disliked = await Like.findByIdAndDelete(existingLikeStatus._id);
         if(!disliked){
            throw new ApiError(500, "Error while disliking video")
         }

         return res.status(200).json(new ApiResponse(200, disliked, "Video disliked successfully"))
    }
    else{
        const liked = await Like.create({
            //Add like
            video: new mongoose.Types.ObjectId(videoId),
            likedBy: new mongoose.Types.ObjectId(req.user?._id),
        });
        if(!liked){
            throw new ApiError(500, "Error while liking video")
        }
        return res.status(200).json(new ApiResponse(200, liked, "Video liked successfully"))
    }


})


// Toggle comment Likes
const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

    
    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400, "CommentId is not valid")
    }

    const existingLikeStatus = await Like.findOne(
        {
            comment: new mongoose.Types.ObjectId(commentId),
            likedBy: new mongoose.Types.ObjectId(req.user?._id), 
        }
    );

    // if already liked
    if(existingLikeStatus){
         // remove likes
         const disliked = await Like.findByIdAndDelete(existingLikeStatus._id);
         if(!disliked){
            throw new ApiError(500, "Error while disliking comment")
         }

         return res.status(200).json(new ApiResponse(200, disliked, "Comment disliked successfully"))
    }
    else{
        const liked = await Like.create({
            //Add like
            comment: new mongoose.Types.ObjectId(commentId),
            likedBy: new mongoose.Types.ObjectId(req.user?._id),
        });
        if(!liked){
            throw new ApiError(500, "Error while liking comment")
        }
        return res.status(200).json(new ApiResponse(200, liked, "Comment liked successfully"))
    }


})


// Toggle tweet likes
const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!tweetId || !isValidObjectId(tweetId)){
        throw new ApiError(400, "Tweet is not valid")
    }

    const existingLikeStatus = await Like.findOne(
        {
            tweet: new mongoose.Types.ObjectId(tweetId),
            likedBy: new mongoose.Types.ObjectId(req.user?._id), 
        }
    );

    // if already liked
    if(existingLikeStatus){
         // remove likes
         const disliked = await Like.findByIdAndDelete(existingLikeStatus._id);
         if(!disliked){
            throw new ApiError(500, "Error while disliking tweet")
         }

         return res.status(200).json(new ApiResponse(200, disliked, "Tweet disliked successfully"))
    }
    else{
        const liked = await Like.create({
            //Add like
            tweet: new mongoose.Types.ObjectId(tweetId),
            likedBy: new mongoose.Types.ObjectId(req.user?._id),
        });
        if(!liked){
            throw new ApiError(500, "Error while liking tweet")
        }
        return res.status(200).json(new ApiResponse(200, liked, "Tweet liked successfully"))
    }

}
)

// get All liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVideos = await Like.aggregate([
        {
            $match:{
                likedBy : new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"video",
            },
        },
        {
            $unwind: "$video",
        },
        {
            $project:{
                video:1,
            },
        },
        {
            $lookup:{
                from : "users",
                localField:"video.owner",
                foreignField:"_id",
                as: "owner"
            },
        },
        {
            $unwind: "$owner",
        },
        {
            $project:{
                video:1,
            },
        },
        {
            $project:{
                _id:1,
                video:1,
                owner:1
            },
        },
    ]); 

    if(!likedVideos?.length){
        throw new ApiError(500, "No liked video found for this user")
    }

    return res.status(200)
    .json(new ApiResponse(200,likedVideos, "Liked videos fetched successfully"))

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}