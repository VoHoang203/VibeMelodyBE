import { v2 as cloudinary } from "cloudinary";

import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});
export async function uploadToCloudinary(file, folder = "spotify_clone") {
  try {
    const filePath = file?.path || file?.tempFilePath;

    if (!filePath) {
      console.error("❌ uploadToCloudinary: file.path is missing!", file);
      throw new Error("File path missing for Cloudinary upload");
    }
    const res = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto",
    });
    return res.secure_url;
  } catch (error) {
    console.log("Error in uploadToCloudinary", error);
    throw new Error("Error uploading to cloudinary");
  }
}
export default cloudinary;