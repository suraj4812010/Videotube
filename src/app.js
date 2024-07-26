import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({limit : "32kb"}))
app.use(express.urlencoded({extended:true , limit:"32kb"}))
app.use(express.static("public"))
app.use(cookieParser())



app.get('/', function (req,res){
   res.send("<h1>Server is running</h1>")
})


// router import
import userRoutes from "./routes/user.route.js"



// router declaration
app.use("/api/v1/users" , userRoutes);




export { app }