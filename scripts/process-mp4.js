require("dotenv").config();
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const { transcribeAudio } = require("./transcribe.js");

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB in bytes
const CHUNK_DURATION = 20 * 60; // 20 minutes in seconds (safe chunk size)

/**
 * Get audio duration in seconds
 */
const getAudioDuration = (audioFile) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioFile, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration);
    });
  });
};

/**
 * Split audio file into chunks
 */
const splitAudio = async (audioFile, baseName) => {
  const duration = await getAudioDuration(audioFile);
  const chunks = [];
  const numChunks = Math.ceil(duration / CHUNK_DURATION);

  console.log(`Splitting audio into ${numChunks} chunks...`);

  for (let i = 0; i < numChunks; i++) {
    const chunkFile = `${baseName}_chunk_${i + 1}.mp3`;
    const startTime = i * CHUNK_DURATION;

    await new Promise((resolve, reject) => {
      ffmpeg(audioFile)
        .setStartTime(startTime)
        .setDuration(CHUNK_DURATION)
        .audioBitrate(64)
        .audioCodec("libmp3lame")
        .save(chunkFile)
        .on("end", () => {
          console.log(`Chunk ${i + 1}/${numChunks} created: ${chunkFile}`);
          resolve();
        })
        .on("error", reject);
    });

    chunks.push(chunkFile);
  }

  return chunks;
};

/**
 * Transcribe chunks and combine results
 */
const transcribeChunks = async (chunks, outputFile, language) => {
  const transcriptions = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Transcribing chunk ${i + 1}/${chunks.length}...`);
    const chunkOutput = `${chunks[i]}_transcription.txt`;

    try {
      await transcribeAudio(0, chunks[i], chunkOutput, language);
      const chunkText = fs.readFileSync(chunkOutput, "utf-8");
      transcriptions.push(chunkText);

      // Clean up chunk transcription file
      fs.unlinkSync(chunkOutput);
    } catch (error) {
      console.error(`Error transcribing chunk ${i + 1}:`, error);
      throw error;
    }
  }

  // Combine all transcriptions
  const combined = transcriptions.join("\n\n");
  fs.writeFileSync(outputFile, combined);

  return combined;
};

/**
 * Extract audio from MP4 file and transcribe it
 * @param {string} mp4FilePath - Path to the MP4 file
 * @param {string} language - Language code (e.g., 'en', 'es', 'fr')
 * @returns {Promise<void>}
 */
const processMP4 = async (mp4FilePath, language = "en") => {
  try {
    // Check if file exists
    if (!fs.existsSync(mp4FilePath)) {
      throw new Error(`File not found: ${mp4FilePath}`);
    }

    // Generate output file names
    const baseName = path.basename(mp4FilePath, path.extname(mp4FilePath));
    const audioOutput = `${baseName}_audio.mp3`;
    const transcriptionOutput = `${baseName}_transcription.txt`;

    console.log(`Processing MP4 file: ${mp4FilePath}`);
    console.log(`Extracting audio with optimized settings...`);

    // Extract audio from MP4 with lower bitrate to reduce file size
    await new Promise((resolve, reject) => {
      ffmpeg(mp4FilePath)
        .audioBitrate(64) // Reduced from 128 to 64 kbps
        .audioCodec("libmp3lame")
        .audioFrequency(16000) // Lower sample rate to reduce size
        .save(audioOutput)
        .on("end", () => {
          console.log(`Audio extracted to: ${audioOutput}`);
          resolve();
        })
        .on("error", (err) => {
          console.error("Error during audio extraction:", err);
          reject(err);
        });
    });

    // Check file size
    const stats = fs.statSync(audioOutput);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

    console.log(`Audio file size: ${fileSizeInMB} MB`);

    if (fileSizeInBytes > MAX_FILE_SIZE) {
      console.log(`File exceeds 25 MB limit. Splitting into chunks...`);

      // Split into chunks
      const chunks = await splitAudio(audioOutput, baseName);

      // Transcribe chunks
      console.log(`Transcribing ${chunks.length} chunks...`);
      await transcribeChunks(chunks, transcriptionOutput, language);

      // Clean up chunks
      console.log(`Cleaning up chunk files...`);
      chunks.forEach((chunk) => {
        if (fs.existsSync(chunk)) {
          fs.unlinkSync(chunk);
        }
      });
    } else {
      console.log(`Transcribing audio...`);
      // Transcribe the audio normally
      await transcribeAudio(0, audioOutput, transcriptionOutput, language);
    }

    console.log(`\n✅ Success!`);
    console.log(`📄 Transcription saved to: ${transcriptionOutput}`);
    console.log(`🎵 Audio file saved to: ${audioOutput}`);

    // Optionally clean up audio file
    // fs.unlinkSync(audioOutput);
  } catch (error) {
    console.error("Error processing MP4:", error);
    process.exit(1);
  }
};

// Run if called directly from command line
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(
      "Usage: node scripts/process-mp4.js <path-to-mp4-file> [language]"
    );
    console.log("Example: node scripts/process-mp4.js video.mp4 en");
    console.log(
      "Language codes: en (English), es (Spanish), fr (French), etc."
    );
    process.exit(1);
  }

  const mp4FilePath = args[0];
  const language = args[1] || "en";

  processMP4(mp4FilePath, language);
}

module.exports = { processMP4 };
