import { v2 as cloudinary } from "cloudinary";
import fs from "fs";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})


const uploadOnCloudinary = async (localFilePath, folder) => {
    
    try {
        if(!localFilePath) return null

        //upload the file on cloudinary
       const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto",
            folder
        })
        // file has been uploaded successfully
        //console.log("File uploaded on cloudinary " , response.url)
        fs.unlinkSync(localFilePath)

        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null
    }
}

// function to delete from cloudinary
const deleteFromCloudinary = async(publicId) => {
        try {
            if (!publicId) return "Could not find the Public Id";
            const res = await cloudinary.uploader.destroy(publicId , {
                resource_type : "image",
            });
            return res;
        } 
      catch (error) {
            console.error("Error while deleting image from Cloudinary", error);
            return null;
      }
}

export {uploadOnCloudinary , deleteFromCloudinary}