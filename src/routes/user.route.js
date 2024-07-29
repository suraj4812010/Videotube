import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
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

// secured route
router.route("/logout").put(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)


// http://localhost:8000/api/v1/users/register

export default router;