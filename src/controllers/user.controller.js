import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


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
            refreshToken : "" 
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
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200, updatedUser, "Account details Updated Successfully"))

})


// update userAvatar
const updateUserAvatar = asyncHandler(async(req,res) =>{

    const avatarLocalpath = req.file?.path;
    console.log("avatar local path : ",avatarLocalpath)
    if(!avatarLocalpath){
        throw new ApiError(400,"Avatar file is missing");
    }

    const avatarResponse = await uploadOnCloudinary(avatarLocalpath);
    console.log("avatar cloudinary reponse : ",avatarResponse)
    if(!avatarResponse.url){
        throw new ApiError(400,"Error while uploading on avatar file");
    }

    // get userId from middleware if loggedIN
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

    const coverImageResponse = await uploadOnCloudinary(coverImageLocalpath);

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

    return res
    .status(200)
    .json(new ApiResponse(200,updatedCoverImage, "CoverImage Updated Successfully"))

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
    updateUserCoverImage
};