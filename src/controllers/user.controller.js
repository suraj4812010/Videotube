import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";


const registerUser = asyncHandler( async (req,res) => {
    res.status(200).json({
        msg : "chai or code"
    })
})




 
export {registerUser};