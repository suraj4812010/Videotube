import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler(async (req,res,next) => {

  try {
    // get accessToken from cookies -> this is short term valid
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  
     if(!token){
      throw new ApiError(401,"Unaothorized request")
     }
  
     // verify accessToken
     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  
     // get payload from accessToken
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
  
     if(!user){
      // next_video : discuss about frontend
      throw new ApiError(401,"Invalid Access Token")
     }
  
     // send this user to next route
     req.user = user;
     next();
  
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token")
  }
})