import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();


app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({limit : "32kb"}))
app.use(express.urlencoded({extended:true , limit:"32kb"}))
app.use(express.static("public"))
app.use(cookieParser())



app.get('/', function (req,res){
   res.json({
    msg : "Hello ji kaise ho saare ?"
   })
})


export { app }