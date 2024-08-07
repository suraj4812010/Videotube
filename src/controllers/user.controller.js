import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


// generate access and refresh token
const generateAccessAndRefreshTokens = async(userId) => 
{
    try {
        // find this user in DB of this userId  from login handler
        const user = await User.findById(userId);
        
        // call methods from user model to generate tokens
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();


        // save this refresh token for this user in DB
        // user = user.toObject();
        user.refreshToken = refreshToken;
        await user.save( { validateBeforeSave: false});

        return {accessToken,refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}


// register user handler
const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend
    // validation on data - not empty
    // check if user already exist :  username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in DB
    // remove password and refresh token field from response
    // check for user creation
    // return response


    // get user details from frontend
    const {  fullName, username, email, password} = req.body;
    // console.log("fullName :", fullName , " email :", email);

    // validation on data - not empty
    if (
        [fullName,email,password,username].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exist :  username, email
    const existedUser = await User.findOne({
        $or : [{ username },{ email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with this email or username already exists")
    } 


    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // console.log("avatarLocalPath :" ,avatarLocalPath)

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    // console.log("coverImageLocalPath :", coverImageLocalPath);

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    // response is coming after uploading avatar on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath , "videotube");
    const coverImage = await uploadOnCloudinary(coverImageLocalPath , "videotube");
    // console.log("avatar response from cloudinary : ",avatar);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    // create user object - create entry in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage : coverImage?.url || "",
        username : username.toLowerCase(),
        email,
        password
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if(!createdUser){
        throw new ApiError(500, "Somthing went wrong while registering the user");
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

// login user handler
const loginUser = asyncHandler(async (req,res) => {
    // req body-> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie


     // req body-> data
    const {email,username,password} = req.body;

    // username or email
    if(!email && !username){
        throw new ApiError(400, "username or email is required")
    }

    // another method
    // if(!(email || username)){
    //     throw new ApiError(400, "username or email is required")
    // }

    // find the user
    const user = await User.findOne({
        $or:[{ email },{ username }]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    // password check
    const isPasswordValid =  await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    //get access and refresh token
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);

    

    // given in response
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // created option for cookie
    const option = {
        httpOnly:true,
        secure:true
    }

    // send cookie
    return res
    .status(200)
    .cookie("accessToken", accessToken , option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(200,
            {
                user:loggedInUser,
                accessToken,
                refreshToken
            },
            "User loggedIn Successfully"
        )
    )

})

// logout user handler
const logoutUser = asyncHandler(async (req,res) => {

    // coming req from auth middleware
    // console.log(req.user);

    // find this user in DB and set refreshToken : undefined
     await User.findByIdAndUpdate(
        req.user?._id,
         {
            $unset : {
                 refreshToken : 1 // this removes the field from the document
            }
            
        },
        {
            new : true
        }
        
    )
    

    const option = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(
        new ApiResponse(200, {} , "User loggedOut Successfully")
    )

})


// refreshAccessToken handler
const refreshAccessToken = asyncHandler(async (req,res) => {

   
    // get refreshToken from cookies -> as this is long term valid
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    // console.log("incoming refresh token ",incomingRefreshToken)

    // validate incomingRefreshToken
    if(!incomingRefreshToken){
     throw new ApiError(401,"Unauthorized request")
    }
 
   try {
      // get payload from refreshToken
      const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  
      // get userId from payload
      const userId = decodedRefreshToken?._id;
  
      // find the user of this userId
      const user = await User.findById(userId);
    //   console.log("decoded token ",decodedRefreshToken);
  
      // if no user found for this refreshToken 
      if(!user){
      throw new ApiError(401, "Invalid refresh token")
      }
  
     // compare incoming refreshToken and refreshToken which is saved in DB
     if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh token is Expired or used")
     }
  
     // after comparing both the tokens generate new token and send to cookie
     const options = {
          httpOnly:true,
          secure:true
      }
  
      
      // after comparing both the tokens generate new token and send to cookie
      const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(userId);
       
      
    //   console.log("new accesstokens " , accessToken);
    //   console.log("new refreshtoken " , refreshToken);
  
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken",refreshToken, options)
      .json(
          new ApiResponse(200,
              {
                  accessToken : accessToken,
                  refreshToken : refreshToken
              },
                 "Access token refreshed successfully"
          )
      )
   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
   }
 
   

})


// change current password handler
const changeCurrentPassword = asyncHandler(async (req,res) => {

    // get old Password and new Password from body/ frontend
    const {oldPassword, newPassword,confPassword} = req.body;

    //validate that oldPassword and newpassword Should not be same
    if(oldPassword===newPassword){
        throw new ApiError(400,"New Password cannot be same as Old Password");
    }

    // validate that newPassword and confPassword Should  be same
    if(!(newPassword===confPassword)){
        throw new ApiError(400,"Confirm Password and New Password should be Same")
    }

    // get userId of loggedIn user from middleware -> req.user
    const userId = req.user._id;
    const user = await User.findById(userId);

    // check old password is correct or not
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400,"Invalid Old Password")
    }

    // set new Password
    user.password = newPassword
    await user.save({validateBeforeSave:false});

    return res.status(200).
    json(new ApiResponse(200, {} , "Password Changed Successfully!"))

})


// get current user
const getCurrentUser = asyncHandler(async(req,res) => {
    return res.status(200)
    .json(new ApiResponse(200, req.user , "Current user fetched Successfully"));
})


// update user account details
const updateAccountDetails = asyncHandler(async(req,res) => {
   const {fullName,email,} = req.body;

   if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
   }

   // get userId from middleware
    const userId = req.user?._id;

    const updatedUser =  await User.findByIdAndUpdate(
    userId,
    {
        $set:{
            fullName,
            email:email
        }
    },
    {
        new:true
    }
   ).select("-password -refreshToken")

   return res
   .status(200)
   .json(new ApiResponse(200, updatedUser, "Account details Updated Successfully"))

})


// update userAvatar
const updateUserAvatar = asyncHandler(async(req,res) =>{

    const avatarLocalpath = req.file?.path;
    // console.log("avatar local path : ",avatarLocalpath)
    if(!avatarLocalpath){
        throw new ApiError(400,"Avatar file is missing");
    }

    const avatarResponse = await uploadOnCloudinary(avatarLocalpath , "videotube");
    // console.log("avatar cloudinary reponse : ",avatarResponse)
    if(!avatarResponse.url){
        throw new ApiError(400,"Error while uploading on avatar file");
    }

    // get userId from middleware if loggedIN and set new Avatar
    const userId = req.user?._id;
    const updatedAvatar = await User.findByIdAndUpdate(
        userId,
        {
            $set :{
                avatar : avatarResponse.url
            }
        },
        {
            new:true
        }
    ).select("-password -refreshToken")


    // delete old avatar
    const oldAvatar = req.user?.avatar;
    
    let publicId ;
    if(oldAvatar){
        const urlParts = oldAvatar.split("/");
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        publicId = publicIdWithExtension.split(".")[0];
    }
    const deleteAvatar = await deleteFromCloudinary(`videotube/${publicId}`);

    if(!deleteAvatar){
        throw new ApiError(400, "Error while deleting old avatar from cloudinary");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedAvatar, "Avatar Updated Successfully"))

})


// update userCoverImage
const updateUserCoverImage = asyncHandler(async(req,res) =>{

    const coverImageLocalpath = req.file?.path;

    if(!coverImageLocalpath){
        throw new ApiError(400,"CoverImage file is missing");
    }

    const coverImageResponse = await uploadOnCloudinary(coverImageLocalpath , "videotube");

    if(!coverImageResponse.url){
        throw new ApiError(400,"Error while uploading on CoverImage file");
    }

    // get userId from middleware if loggedIN
    const userId = req.user?._id;

    const updatedCoverImage = await User.findByIdAndUpdate(
        userId,
        {
            $set :{
                coverImage : coverImageResponse.url
            }
        },
        {
            new:true
        }
    ).select("-password -refreshToken")

    // delete old coverImage
    const oldCover = req.user?.coverImage;
    let publicId ;
    
    if(oldCover){
        const urlParts = oldCover.split("/");
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        publicId = publicIdWithExtension.split(".")[0];
    }
    const deleteCover = await deleteFromCloudinary(`videotube/${publicId}`);

    if(!deleteCover){
        throw new ApiError(400, "Error while deleting old coverImage from cloudinary");
    }


    return res
    .status(200)
    .json(new ApiResponse(200,updatedCoverImage, "CoverImage Updated Successfully"))

})




// get user channel profile
const getUserChannelProfile = asyncHandler(async (req,res) => {
    // get username from params
    const {username} = req.params;

    if(!username?.trim()){
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            // find the username in db
            $match:{
                username : username.toLowerCase()
            }
        },
        {
            // look for no of subscribers of a channel/user by filtering out by channel name
            $lookup:{
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as: "subscribers"
            }
        },
        {
            // look for no of channel subscribed by user by filtering subscriber 
            $lookup:{
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as: "subscribedTo"
            }
        },
        {
            // add these field to the document
            $addFields:{
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                    then : true,
                    else : false
                }
            }
        },
        {
            // project means to show all these fileds in response
            $project:{
                username:1,
                fullName:1,
                subscribersCount:1,
                channelSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])


    if(!channel?.length){
        throw new ApiError(404, "Channel does not exist")
    }

    console.log("channel : ",channel);

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )


})



// get watch history handler
const getWatchHistory = asyncHandler(async (req,res) => {

    const user = await User.aggregate([
        {
            // find the user by _id coming from middleware
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {   
            // at this point we get all the watch history array having videos object
            $lookup : {
                from : "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        // at this point we are in videos look for owner details of this each video
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullName :1,
                                        username :1,
                                        avatar : 1

                                    }
                                }
                            ]
                        }
                    },
                    // add first field from 
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])


    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory , "Watch History fetched successfully")
    )

})





export {
    registerUser,
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword, 
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};