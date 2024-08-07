import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body;
    if(!content){
        throw new ApiError(400, "Content for tweet is Required")
    }

    const userId = req.user._id;
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid UserId")
    }

    const tweet = {
        content,
        userId
    }

   const createdTweet = await Tweet.create({tweet})

   return res.status(201)
   .json(new ApiResponse(201, createdTweet , "Tweet created Successfull"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}