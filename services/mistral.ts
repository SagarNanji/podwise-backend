import {Mistral} from "@mistralai/mistralai";
import fs from "fs";
import {getDb} from "../src/utils/db";
import {GridFSBucket, ObjectId} from "mongodb";
import path from "path";

import {configDotenv} from "dotenv";


configDotenv();

const apiKey = process.env.MISTRAL_API_KEY;
console.log(`MISTRAL_API_KEY: ${apiKey ? "set" :"not set"}` + ` (${typeof apiKey})` + `, length: ${apiKey ? apiKey.length : "undefined"}`) ;

if (!apiKey) {
    throw new Error("MISTRAL_API_KEY is not set in environment variables.");
}

const client = new Mistral({apiKey: apiKey});

export const transcribeAudio = async (fileId: ObjectId): Promise<string> => {
    const db = getDb();
    const bucket = new GridFSBucket(db, {bucketName: 'audioChunks'});

    const tempFilePath = path.join('uploads', `${fileId.toHexString()}.mp3`); // Create a temporary file path

    // Download the audio chunk from GridFS to a temporary file
    await new Promise<void>((resolve, reject) => {
        const downloadStream = bucket.openDownloadStream(fileId);
        const writeStream = fs.createWriteStream(tempFilePath);

        downloadStream.pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
    });

    try {
        const audio_file = fs.readFileSync(tempFilePath);
        const transcriptionResponse = await client.audio.transcriptions.complete({
            model: "voxtral-mini-latest",
            file: {
                fileName: `${fileId.toHexString()}.mp3`,
                content: audio_file,
            },
            timestampGranularities: ["segment"]
        });

        return JSON.stringify(transcriptionResponse.segments)
    } finally {
        // Clean up the temporary file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`Deleted temporary audio file: ${tempFilePath}`);
        }
    }
};
