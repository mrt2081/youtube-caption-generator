require("dotenv").config();
const fs = require("fs");
const OpenAI = require("openai");

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });
const systemPrompt =
  "You are a helpful assistant for creating transcibe from audio files, Your task is to correct any spelling discrepancies in the transcribed text. Only add necessary punctuation such as periods, commas, and capitalization, and use only the context provided.";

const transcribeAudio = async (
  temperature,
  audioFile,
  outputFile,
  language
) => {
  console.log("Start: transcript");

  const transcript = await transcribe(audioFile, temperature, language);
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: transcript,
      },
    ],
  });
  const result = completion.choices[0].message.content;

  console.log(result);
  fs.writeFileSync(outputFile, result);
  console.log("Finish: transcript");

  return result;
};

async function transcribe(file, temperature, language) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(file),
    model: "whisper-1",
    language, // this is optional but helps the model
    response_format: "srt",
    temperature,
  });
  return transcription?.text || transcription;
}

// generateCorrectedTranscript(0.2, systemPrompt, "output.mp3")
//   .then((correctedText) => {
//     console.log(correctedText);
//     // Save the transcription to a file
//     fs.writeFile("transcription.txt", correctedText, (err) => {
//       if (err) {
//         console.error("Error writing transcription to file:", err);
//       } else {
//         console.log("Transcription saved to transcription.txt");
//       }
//     });
//   })
//   .catch((error) => console.error(error));

module.exports = { transcribeAudio };
