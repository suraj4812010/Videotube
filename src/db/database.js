import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const MONGODB_URL = process.env.MONGODB_URL;

const connectDB = async () => {
    try {
      const connectionInstance = await mongoose.connect(`${MONGODB_URL}/${DB_NAME}`)
      console.log(`\n DB Connected Successfully !! DB HOST: ${connectionInstance.connection.host}`)
        
    } catch (error) {
        console.error("MONGODB CONNECTION ISSUE! ");
        console.log("ERROR: ",error);
        process.exit(1);
    }
}

export default connectDB;
