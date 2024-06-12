const fs = require("fs");
const OpenAI = require("openai");

const apiKey = process.env.OPENAI_KEY;
const openai = new OpenAI({ apiKey });

const translateAudio = async (inputFile, outputFile) => {
  console.log("Start: translateAudio");

  const translation = await openai.audio.translations.create({
    file: fs.createReadStream(inputFile),
    model: "whisper-1",
    response_format: "srt",
    temperature: 0.2,
  });

  fs.writeFileSync(outputFile, translation);
  console.log("Finish: translateAudio");
};
module.exports = { translateAudio };
