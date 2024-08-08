import mongoose,{isValidObjectId} from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


// get all comments
const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    // validate video ID
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "getVideoComments :: Video Id is not valid");
    }

    // find all comments of this video
    const comments = await Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId),
            },

        },
        {  
            $lookup:{
                from : "users",
                localField : "owner",
                foreignField:"_id",
                as : "owner",
                pipeline : [
                    {
                        $project : {
                            _id:1,
                            username:1,
                            avatar:1,
                        },
                    },
                ],
            },

        },
        { // find likes of  this video
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes",
            },
        },
        {
            $addFields : {
                likesCount : {
                    $size : "$likes"
                },
            },
        },
        {
            $project: {
                _id:1,
                username:1,
                avatar:1,
                likesCount:1,
                content:1,
                owner:1,
            },
        },
        {
            $skip : (page-1)*limit,
        },
        {
            $limit : parseInt(limit),
        },
    ]);

    return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));


})

// add comment
const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    // get comment content from body and videoId from params
    const { content } = req.body;
    const { videoId } = req.params;

    // validate if content field is empty or not
    if (!content?.trim()) {
        throw new ApiError(400, "addComment :: Comment cannot be empty");
    }
    // validate video Id
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "addComment :: Video Id is not valid");
    }

    // create comment
    const comment = await Comment.create({
        content,
        video: new mongoose.Types.ObjectId(videoId),
        owner: new mongoose.Types.ObjectId(req.user?._id),
    });

    if (!comment) {
        throw new ApiError(400, "addComment :: Error while adding comment");
    }

    return res.status(200)
    .json(new ApiResponse(200, comment, "Comment added successfully"))

})

// update comment
const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {content} = req.body;
    const {commentId} = req.params;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "updateComment :: Comment Id is not valid");
    }
    if (!content?.trim()) {
        throw new ApiError(400, "Comment cannot be empty");
    }

    const comment = await Comment.findById(commentId);

    // check if req user is same as comment owner to update comment 
    if(req.user?._id.toString() !== comment.owner.toString()){
        throw new ApiError(
            401,
            "updateComment :: You do not have permission to perform this action"
        );
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
          $set: { content },
        },
        {
          new: true,
        }
    );

    if (!updateComment) {
        throw new ApiError(400, "updateComment :: Error while updating comment");
    }
    
    return  res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated"));


})

// delete comment
const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Comment Id is not valid");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
    throw new ApiError(400, "deleteComment :: Comment not found");
    }

    // check if req user is same as comment owner to delete comment
    if (req.user?._id.toString() !== comment.owner.toString()) {
        throw new ApiError(
          401,
          "updateComment :: You do not have permission to perform this action"
        );
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);
    if (!deletedComment) {
    throw new ApiError(400, "deleteComment :: Error while deleting comment");
    }

    return  res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted"));

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }