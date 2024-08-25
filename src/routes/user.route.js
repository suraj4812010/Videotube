import { Router } from "express";
import { 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage, 
    getUserChannelProfile, 
    getWatchHistory, 
    forgotPassword,
    resetPassword
} from "../controllers/user.controller.js";

import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();


router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    registerUser);

router.route("/login").post(loginUser)

// forgot password and reset password
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);


// secured route
router.route("/logout").put(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/changePassword").post(verifyJWT, changeCurrentPassword)
router.route("/getCurrentUser").get(verifyJWT,getCurrentUser)
router.route("/updateAccountDetails").patch(verifyJWT,updateAccountDetails)

router.route("/updateAvatar").put(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
)
router.route("/updateCoverImage").put(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
)


router.route("/channel/:username").get(verifyJWT, getUserChannelProfile)
router.route("/watchHistory").get(verifyJWT, getWatchHistory)


// http://localhost:8000/api/v1/users/register

export default router;