import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"

// get all videos
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    
    const skip = (page - 1) * limit;

    const videos = await Video.aggregate([
        {
            $match:{
                $or : [
                    { title : {$regex : query, $options: "i"}},
                    { description: { $regex : query, $options: "i"}},
                ],
            },
        },
        {
            $lookup : {
                from : "users",
                localField: "owner",
                foreignField: "_id",
                as : "owner",
                pipeline : [
                    {
                        $project : {
                            avatar : 1,
                            username:1,
                            fullName:1,
                        },
                    },
                ],
            },
        },
        {
            $project: {
            _id: 1,
            owner: 1,
            "videoFile.url": 1,
            "thumbnail.url": 1,
            createdAt: 1,
            title: 1,
            duration: 1,
            views: 1,
            },
        },
        {
            $sort : {
                [sortBy] : sortType === "asc" ? 1 : -1,
            },
        },
        {
            $limit : limit*1,
        },
        {
            $skip : skip,
        },
    ])

    console.log("VIDEOS: ", videos);
  res
  .status(200)
  .json(new ApiResponse(200, videos, "Videos fetched successfully"));


})

// publish New video
const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video

    // get title and description from body
    const { title, description} = req.body
    
    // check if title and description is no empty
    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }
    
      // get video and thumbnail file from files
      const videoFileLocalPath = req.files?.videoFile[0]?.path;
      const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    
      if (!videoFileLocalPath) throw new ApiError(400, "Video File is required");
      if (!thumbnailLocalPath) throw new ApiError(400, "Thumbnail is required");
    
      // upload video on cloudinary
      const videoFile = await uploadOnCloudinary(videoFileLocalPath, "videotube");
      //   console.log("VIDEO FILE", videoFile);
      if (!videoFile) throw new ApiError(400, "Cloudinary: Video File is required");
    
      // upload thumbnail on cloudinary
      const thumbnail = await uploadOnCloudinary(thumbnailLocalPath , "videotube");
      if (!thumbnail) throw new ApiError(400, "Cloudinary: Thumbnail is required");
    
      // create entry in Database
      const video = await Video.create({
        title,
        description,
        thumbnail: {
          url: thumbnail.url,
          publicId: thumbnail.public_id,
        },
        videoFile: {
          url: videoFile.url,
          publicId: videoFile.public_id,
        },
        duration: videoFile?.duration,
        isPublished: true,
        owner: new mongoose.Types.ObjectId(req.user?._id),
      });
    
      if (!video) throw new ApiError(500, "Error while uploading video");
      //   console.log("VIDEO", video);
      return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded Successfully"));
        
})


// get single video by videoId
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!videoId || !isValidObjectId(videoId)) throw new ApiError(404, "VideoID not found")

    // check if video is present in DB or not
    const videoFind = await Video.findById(videoId);
    if (!videoFind){
         throw new ApiError(404, "Video not found");
    } 

    
    const video = await Video.aggregate([
        {
            // find the video of this videoId
            $match : {
                _id : new mongoose.Types.ObjectId(videoId)
            },
        },
        {   // check for likes of this video 
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "video",
                as : "likes",
            },
        },
        {   // add fields of likesCount and isLiked
            $addFields : {
                likesCount : {
                    $size : "$likes",
                },
                isLiked : {
                    $cond : {
                        if : {$in : [req.user?._id, "$likes"]},
                        then : true,
                        else : false,
                    },
                },
            },

        },
        {   // look the owners details of this video who has uploaded this video
            $lookup : {
                from : "users",
                localField:"owner",
                foreignField : "_id",
                as : "owner",
                pipeline : [
                    {   // look for subscribers of this video owner
                        $lookup : {
                            from : "subscriptions",
                            localField:"_id",
                            foreignField : "channel",
                            as : "subscribers"
                        }
                    },
                    {
                        $addFields : {
                            // These will include in this stage
                            subscribersCount : {
                                $size : "$subscribers",
                            },
                            isSubscribed : {
                                $cond: {
                                if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                                then: true,
                                else: false,
                                },
                            },
                        },
                    },
                    {
                        // show all this fields in owner
                        $project: {
                            fullName: 1,
                            username: 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                            avatar: 1,
                        },
                    },
                ]
            },
        },
        {
            // look for the comments on this video
            $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "video",
            as: "comments",
            },
        },
        {
            // show all this in response
            $project: {
                "videoFile.url": 1,
                "thumbnail.url": 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                likesCount: 1,
                isLiked: 1,
                comments: 1,
                owner: 1,
            },
        },
    ])

    if(!video || video === null) {
        throw new ApiError(404, "Video not found")
    }

    // increase the views by 1
    await Video.findByIdAndUpdate(videoId , {
        $inc : {
            views : 1,
        },
    });

    // add this video to the watch history to this loggedIn user
    await User.findByIdAndUpdate(req.user?._id , {
        $addToSet : {
            watchHistory : videoId,
        }
    });

    // console.log("VIDEO", video);
    return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));



})

// update video details
const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const {title, description} = req.body;
    
    // if (!(title || description)) {
        //   throw new ApiError(400, "updateVideo :: Title or Description is required");
        // }
        
        // get video id from params
    const { videoId } = req.params

    // validate videoId
    // if(!videoId || !isValidObjectId(videoId)){
    //     throw new ApiError(400, "VideoId not found")
    // }

    // find video of this videoId in Db
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found");
    }

    // check is video owner is same as req user
    if(req.user?._id.toString() !== video?.owner._id.toString()){
        throw new ApiError(
        401,
            "updateVideo :: You do not have permission to perform this action"
        );
    }

    // upload thumbnail
    const thumbnailLocalPath = req.file?.path;

    if(!thumbnailLocalPath){
        throw new ApiError(400, "updateVideo :: Thumbnail is required");
    }

    // upload on cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, "videotube")

    if(!thumbnail){
        throw new ApiError(
            400,
            "updateVideo :: Error while uploading thumbnail on Cloudinary"
        );
    }

    // update the video details
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title : title || video?.title,
                description : description || video?.description,
                thumbnail : {
                    url : thumbnail?.url,
                    publicId : thumbnail?.public_id,
                },
            },
        },
        {
            new : true
        }
    )

    if(!updateVideo){
        throw new ApiError(400, "updateVideo :: Error while updating video");
    }

    // get old thumbnail public_id 
    const oldThumbnailPublicId = video?.thumbnail?.publicId;

    if(!oldThumbnailPublicId){
        throw new ApiError(500, " updateVideo :: oldThumbnailPublicId not found");
    }

    // delete old thumbnail
    const deleteOldThumbnail = await deleteFromCloudinary(oldThumbnailPublicId);

    if(!deleteOldThumbnail){
        throw new ApiError(
            500,
            "updateVideo :: Error while deleting old thumbnail from Cloudinary"
        );
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));


})

// delete video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    // validate videoId
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "deleteVideo :: Error while getting videoId");
    }

    // find if video exist in DB or not
    const video = await Video.findById(videoId);
    if (!video){
     throw new ApiError(404, "Video not found");
    }    

    // validate if user is same as video owner to delete
    if (req.user?._id.toString() !== video?.owner._id.toString()) {
        throw new ApiError(
          401,
          "deleteVideo :: You do not have permission to perform this action"
        );
    } 

    // delete video from DB , videoFile and thumbnailFile from cloudinary
    const deletedVideo = await Video.findByIdAndDelete(videoId);
    const delVideoFile = await deleteFromCloudinary(video?.videoFile?.publicId);
    const delThumbnail = await deleteFromCloudinary(video?.thumbnail?.publicId);

    if (!delVideoFile || !delThumbnail) {
        throw new ApiError(
          500,
          "deleteVideo :: Error while deleting video from Cloudinary"
        );
    }

    return res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Video Deleteted successfully"));

})

// toggle publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
    // get videoId from params
    const { videoId } = req.params

    // validate  videoId 
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiResponse(400, "togglePublishVideo :: Video id is not valid");
    }

    // find if video is present in DB or not
    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "togglePublishVideo :: Video not found")
    }

    // validate if video owner is same as req user
    if (req.user?._id.toString() !== video?.owner._id.toString()) {
        throw new ApiError(
          401,
          "togglePublishVideo :: You do not have permission to perform this action"
        );
    }

    // update video published
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
          $set: { isPublished: !video?.isPublished },
        },
        {
          new: true,
        }
    );

    return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Publish status toggled successfully"));

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}