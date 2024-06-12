### Project Title
Audio Transcription and Translation Tool

### Description
This project is a tool that allows users to extract audio from YouTube videos, transcribe the audio content, translate the transcription, and provide the output files for download.

### Features
- Extract audio from YouTube videos
- Transcribe audio content
- Translate the transcription
- Download the output files in a zip archive

### Installation
1. Clone the repository
2. Install dependencies using `npm install`
3. Set up environment variables by creating a `.env` file with the following:
   OPENAI_API_KEY=your_openai_api_key

4. Run the server using `npm start`

### Usage
1. Access the application through the browser at [http://localhost:3001](http://localhost:3001).
2. Fill in the YouTube link, language, and email in the provided form.
3. Submit the form to process the audio extraction, transcription, translation, and receive the download link for the output files.

### Technologies Used
- Node.js
- Express.js
- OpenAI API
- ffmpeg
- ytdl-core

### File Structure
- `server.js`: Main server file handling audio processing and file management.
- `scripts/extract-audio.js`: Contains functions to extract audio from a video.
- `scripts/transcribe.js`: Handles audio transcription using OpenAI API.
- `scripts/translate.js`: Manages audio translation using OpenAI API.
- `public/index.html`: Frontend form for user input.

### Acknowledgements
- Code snippets provided by [extract-audio.js](scripts/extract-audio.js), [transcribe.js](scripts/transcribe.js), [translate.js](scripts/translate.js), and [server.js](server.js).

### License
This project is licensed under the MIT License.
