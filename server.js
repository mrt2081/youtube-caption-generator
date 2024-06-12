const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { extractAudio } = require("./scripts/extract-audio.js");
const { transcribeAudio } = require("./scripts/transcribe.js");
const { translateAudio } = require("./scripts/translate.js");
const crypto = require("crypto");
const archiver = require("archiver");

const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Generate a random prefix
const generatePrefix = () => crypto.randomBytes(6).toString("hex");

// Clean up files
const cleanUpFiles = (files) => {
  files.forEach((file) =>
    fs.unlink(file, (err) => {
      if (err) console.error(`Error deleting file ${file}:`, err);
    })
  );
};

// Process form submission
app.post("/process", async (req, res) => {
  const { youtubeLink, language, email } = req.body;
  const prefix = generatePrefix();

  const audioOutput = `${prefix}_output.mp3`;
  const transcriptionOutput = `${prefix}_transcription.txt`;
  const translationOutput = `${prefix}_translation.txt`;
  const zipOutput = `${prefix}_output.zip`;

  try {
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    // Extract audio
    await extractAudio(youtubeLink, audioOutput);

    // Transcribe
    await transcribeAudio(0, audioOutput, transcriptionOutput, language);

    // Translate
    await translateAudio(audioOutput, translationOutput);

    // // Send email with output files
    // const transporter = nodemailer.createTransport({
    //   service: "gmail",
    //   auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS,
    //   },
    // });

    // const mailOptions = {
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: "Your YouTube Audio Transcription and Translation",
    //   text: "Attached are the transcription and translation files.",
    //   attachments: [
    //     {
    //       filename: `${prefix}_output.mp3`,
    //       path: path.join(__dirname, audioOutput),
    //     },
    //     {
    //       filename: `${prefix}_transcription.txt`,
    //       path: path.join(__dirname, transcriptionOutput),
    //     },
    //     {
    //       filename: `${prefix}_translate.txt`,
    //       path: path.join(__dirname, translationOutput),
    //     },
    //   ],
    // };

    // await transporter.sendMail(mailOptions);

    // Create zip file
    const output = fs.createWriteStream(zipOutput);

    output.on("close", () => {
      res.status(200).json({
        message: "Files processed successfully",
        downloadLink: `/download/${zipOutput}`,
      });

      // Clean up files after sending the response
      cleanUpFiles([audioOutput, transcriptionOutput, translationOutput]);
    });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.file(audioOutput, { name: `${prefix}_output.mp3` });
    archive.file(transcriptionOutput, { name: `${prefix}_transcription.txt` });
    archive.file(translationOutput, { name: `${prefix}_translate.txt` });
    archive.finalize();
  } catch (error) {
    console.error(error);
    cleanUpFiles([audioOutput, transcriptionOutput, translationOutput]); // Attempt to clean up files in case of error
    res.status(500).json({ message: "Failed to process request" });
  }
});

// Serve zip files
app.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, req.params.filename);
  res.download(filePath, (err) => {
    if (err) {
      console.error(`Error downloading file ${filePath}:`, err);
    } else {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Error deleting file ${filePath}:`, err);
      });
    }
  });
});

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
