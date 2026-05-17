require("dotenv").config();
const fs = require("fs");
const OpenAI = require("openai");

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });

// Parse SRT file and extract text content
function parseSRT(content) {
  const lines = content.split('\n');
  const subtitles = [];
  let currentSubtitle = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line is a number (subtitle index)
    if (/^\d+$/.test(line)) {
      if (currentSubtitle) {
        subtitles.push(currentSubtitle);
      }
      currentSubtitle = { index: parseInt(line), text: [] };
    }
    // Check if line is a timestamp
    else if (line.includes('-->')) {
      // Skip timestamp line
      continue;
    }
    // Check if line is text content
    else if (line && currentSubtitle) {
      currentSubtitle.text.push(line);
    }
  }
  
  if (currentSubtitle) {
    subtitles.push(currentSubtitle);
  }
  
  return subtitles;
}

// Combine subtitles into paragraphs for book format
function combineIntoParagraphs(subtitles) {
  const paragraphs = [];
  let currentParagraph = [];
  
  for (const subtitle of subtitles) {
    const text = subtitle.text.join(' ').trim();
    if (!text) continue;
    
    // Check if this should start a new paragraph
    // (e.g., if it's a title, starts with capital letter after a period, or is very short)
    const shouldStartNewParagraph = 
      text.endsWith('.') || 
      text.endsWith('!') || 
      text.endsWith('?') ||
      text.length < 30 ||
      /^[A-Z]/.test(text);
    
    currentParagraph.push(text);
    
    if (shouldStartNewParagraph && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [];
    }
  }
  
  // Add remaining paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '));
  }
  
  return paragraphs;
}

// Translate text to Persian using OpenAI
async function translateToPersian(text, chunkSize = 3000) {
  const chunks = [];
  
  // Split text into chunks if too long (respecting sentence boundaries)
  if (text.length > chunkSize) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const testChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
      if (testChunk.length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk = testChunk;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
  } else {
    chunks.push(text);
  }
  
  const translations = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      console.log(`  Translating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using mini for faster/cheaper translation
        messages: [
          {
            role: "system",
            content: "You are a professional translator. Translate the following English text to Persian (Farsi). Maintain the original meaning, tone, and style. Format it as natural Persian prose suitable for a book. Do not add any explanations or notes, only provide the translation."
          },
          {
            role: "user",
            content: chunk
          }
        ],
        temperature: 0.3,
      });
      
      const translation = response.choices[0].message.content.trim();
      translations.push(translation);
      
      // Add delay to avoid rate limits
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error translating chunk: ${error.message}`);
      translations.push(`[خطا در ترجمه]`);
    }
  }
  
  return translations.join(' ');
}

// Main function
async function translateSRTToBook(inputFile, outputFile) {
  console.log("Reading SRT file...");
  const content = fs.readFileSync(inputFile, 'utf-8');
  
  console.log("Parsing SRT format...");
  const subtitles = parseSRT(content);
  console.log(`Found ${subtitles.length} subtitles`);
  
  console.log("Combining into paragraphs...");
  const paragraphs = combineIntoParagraphs(subtitles);
  console.log(`Created ${paragraphs.length} paragraphs`);
  
  console.log("Translating to Persian...");
  const translatedParagraphs = [];
  
  // Process paragraphs in batches to combine related content
  const batchSize = 5; // Combine 5 paragraphs at a time for better context
  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, Math.min(i + batchSize, paragraphs.length));
    const batchText = batch.join(' ');
    console.log(`Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(paragraphs.length / batchSize)} (paragraphs ${i + 1}-${Math.min(i + batchSize, paragraphs.length)})...`);
    const translated = await translateToPersian(batchText);
    // Split back into individual paragraphs (rough approximation)
    const translatedBatch = translated.split(/\n\n+/).filter(p => p.trim());
    translatedParagraphs.push(...translatedBatch);
  }
  
  console.log("Formatting as book...");
  const bookContent = translatedParagraphs.join('\n\n');
  
  // Add title and formatting
  const finalContent = `کتاب صبح جادویی - فصل سوم\n\n${bookContent}`;
  
  console.log("Writing to file...");
  fs.writeFileSync(outputFile, finalContent, 'utf-8');
  
  console.log(`Translation complete! Output saved to ${outputFile}`);
}

// Run if called directly
if (require.main === module) {
  const inputFile = process.argv[2] || '1_transcription.txt';
  const outputFile = process.argv[3] || '1_transcription_persian_book.txt';
  
  translateSRTToBook(inputFile, outputFile).catch(console.error);
}

module.exports = { translateSRTToBook, parseSRT, combineIntoParagraphs };

