const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const extractAndSaveAudio = async (audioStream, outputFilePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(audioStream)
      .audioBitrate(128)
      .save(outputFilePath)
      .on("end", () => {
        console.log(`Audio extracted and saved to ${outputFilePath}`);
        resolve();
      })
      .on("error", (err) => {
        console.error("Error during audio extraction:", err);
        reject(err);
      });
  });
};

const extractAudio = async (videoUrl, outputFilePath) => {
  try {
    // Get video info
    const info = await ytdl.getInfo(videoUrl);
    console.log(`Title: `, info.videoDetails.title);

    // Download the video and extract audio
    const audioStream = ytdl(videoUrl, { quality: "highestaudio" });

    //audioStream.pipe(fs.createWriteStream(outputFilePath));

    // Ensure ffmpeg is installed and available in your PATH
    await extractAndSaveAudio(audioStream, outputFilePath);
  } catch (err) {
    console.error("Error:", err);
  }
};

module.exports = { extractAudio };
