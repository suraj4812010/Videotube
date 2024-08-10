import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiResponse(400, "toggleSubscription :: Channel id is not valid")
    }

    const existingSubscriptionStatus = await Subscription.findOne({
        subscriber : req.user?._id,
        channel : channelId
    });

    if(existingSubscriptionStatus){
        //  if subscribed then remove subscription
        const unsubscribe = await Subscription.findByIdAndDelete(existingSubscriptionStatus._id)

        if(!unsubscribe){
            throw new ApiError(500, "toggleSubscription :: Error while unsubscribing")
        }
        return res.status(200)
        .json(new ApiResponse(200, unsubscribe, "Unsubscribed Successfully"))

    }
    else{
         // if not subscribed then add subscription
         const subscribe = await Subscription.create({
            subscriber : req.user?._id,
            channel : channelId
         })

         if(!subscribe){
            throw new ApiError(500, "toggleSubscription :: Error while subscribing")
         }
         return res.status(200)
        .json(new ApiResponse(200, subscribe, "Subscribed Successfully"))
    }

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiResponse(400, "getUserChannelSubscribers :: Channel id is not valid")
    }  

    const subscriber = await Subscription.aggregate([
        {
            $match:{
                channel : new mongoose.Types.ObjectId(channelId)
            },
        },
        {
            $lookup:{
                from :"users",
                localField : "subscriber",
                foreignField:"_id",
                as:"subscribers", // here we can use further pipeline too for more details
            },
        },
        {
            $addFields:{
                subscriberCount : {
                    $size : "$subscribers",
                },
            },
        },
        {
            $project:{
                subscriberCount:1,
                subscribers : {
                    _id:1,
                    username:1,
                    avatar:1,
                    fullName:1,
                },
            },
        },

    ])

    if(!subscriber){
        throw new ApiError(404, "getUserChannelSubscribers :: Subscriber not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, subscriber, "Subscribers fetched"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if(!subscriberId || !isValidObjectId(subscriberId)){
        throw new ApiResponse(400, "getSubscribedChannels :: subscriberId is not valid")
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match:{
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            },
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channels",
            },
        },
        {
            $addFields:{
                channelCount : {
                    $size : "$channels",
                },
            },
        },
        {
            $project:{
                channelCount:1,
                channels:{
                    _id:1,
                    username:1,
                    avatar:1,
                },
            },
        },
    ]);

    if(!subscribedChannels?.length){
        throw new ApiError(404, "getSubscribedChannels :: Channel not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, subscribedChannels , "Channels fetched successfully"))

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}