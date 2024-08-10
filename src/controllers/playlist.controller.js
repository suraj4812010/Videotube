import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

// create playlist handler
const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const {name, description} = req.body
    if(!name){
        throw new ApiError(400, "createPlaylist :: Name is required")
    }

    const playlist = await Playlist.create({
        name,
        description : description || "",
        owner : req.user?._id,
    })

    if(!playlist){
        throw new ApiError(400, "createPlaylist :: Error while creating playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200,playlist,"Playlist created successfully"))
})

// get playlist by userId
const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const {userId} = req.params
    if(!userId || !isValidObjectId(userId)){
        throw new ApiError(400,  "getUserPlaylists :: User Id is not valid")
    }

    const playlists = await Playlist.aggregate([
        {
            $match:{
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
    ]);

    // OR
    // const playlist = await Playlist.find({ owner: userId });

    if(!playlists?.length){
        throw new ApiError(404, "getUserPlaylists :: No playlists found for this user")
    }

    return res.status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully"))

})

// get playlist By playlist Id
const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    const {playlistId} = req.params
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,  "getPlaylistsById :: Playlist Id is not valid")
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(404, "getPlaylistById :: Playlist not found" )
    }

    return res.status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"))

})

// add video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    // TODO: add video to playlist
    const { videoId, playlistId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400, "addVideoToPlaylist :: Playlist Id is not valid");
    }

    if(!videoId ){
        throw new ApiError(400, "addVideoToPlaylist :: Video Id is not valid");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(400, "addVideoToPlaylist :: Playlist not found");
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(400, "addVideoToPlaylist :: Video not found");
    }

    // validate if playlist owner is same as req user or not
    if(playlist.owner._id.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "addVideoToPlaylist :: You do not have permission to perform this action")
    }

    if(playlist.videos.includes(videoId)){
        throw new ApiError(400, "addVideoToPlaylist :: Video already in playlist");
    }

    // add video to playlist
    playlist.videos.push(videoId);
    await playlist.save({ validateBeforeSave : false })

    return res.status(200)
    .json(new ApiResponse(200, playlist, "Video added to playlist successfully"))


})

// remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    const {playlistId, videoId} = req.params

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400, "removeVideoFromPlaylist :: Playlist Id is not valid");
    }

    if(!videoId ){
        throw new ApiError(400, "removeVideoFromPlaylist :: Video Id is not valid");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(400, "removeVideoFromPlaylist :: Playlist not found");
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(400, "removeVideoFromPlaylist :: Video not found");
    }

    // validate if playlist owner is same as req user
    if(playlist.owner._id.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "removeVideoFromPlaylist :: You do not have permission to perform this action")
    }

    if(!playlist.videos.includes(videoId)){
        throw new ApiError(400, "removeVideoFromPlaylist :: Video not in playlist");
    }

    // remove video from playlist
    playlist.videos = playlist.videos.filter((vid) => vid.toString() !== videoId);
    await playlist.save({ validateBeforeSave: false });

    return res.status(200)
    .json(new ApiResponse(200, playlist, "Video removed successfully"))

})

// update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    //TODO: update playlist
    const {playlistId} = req.params
    const {name, description} = req.body

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400, "updatePlaylist :: Playlist id is not valid");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(400, "updatePlaylist :: Playlist not found");
    }

    if(!name){
        throw new ApiError(400, "updatePlaylist :: Name is required");
    }

   
    // validate if playlist owner is same as req user
    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401,"updatePlaylist :: You do not have permission to perform this action")
    }
    

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set : {
                name,
                description: description || playlist.description
            },
        },
        {
            new : true,
        }
    )

    if(!updatedPlaylist){
        throw new ApiError(500, "updatePlaylist :: Error while updating playlist");
    }

    return res.status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))

})

// delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const {playlistId} = req.params
    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400, "deletePlaylist :: Playlist id is not valid");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(400, "deletePlaylist :: Playlist not found");
    }

    // validate playlist owner is same as req user
    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "deletePlaylist :: You do not have permission to perform this action")
    }
 
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);
    if(!deletedPlaylist){
        throw new ApiError(500, "deletePlaylist :: Error while deleting playlist");
    }

    return res.status(200)
    .json(new ApiResponse(200, deletedPlaylist, "Playlist deleted successfully"));

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}