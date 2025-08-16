import { getAudioDurationInSeconds } from 'get-audio-duration';
import { spawn } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { getDb } from '../utils/db';
import { GridFSBucket, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

export const splitAudio = async (filePath: string): Promise<ObjectId[]> => {
    if (!ffmpeg) {
        throw new Error('ffmpeg-static not found');
    }
    console.log("Starting audio splitting process...");
    const db = getDb();
    const bucket = new GridFSBucket(db, { bucketName: 'audioChunks' });
    const duration = await getAudioDurationInSeconds(filePath);
    console.log(`Audio duration: ${duration} seconds`);
    const fifteenMinutes = 15 * 60;
    const fourteenMinutes = 14 * 60;
    const chunkIds: ObjectId[] = [];

    if (duration > fifteenMinutes) {
        console.log("Audio is longer than 15 minutes, splitting into chunks...");
        const chunks = Math.ceil(duration / fourteenMinutes);
        for (let i = 0; i < chunks; i++) {
            const startTime = i * fourteenMinutes;
            const outputFilePath = path.join('uploads', `chunk-${i}-${Date.now()}.mp3`);
            console.log(`Creating chunk ${i + 1}/${chunks} from ${startTime}s`);
            
            const ffmpegArgs = [
                '-i', filePath,
                '-ss', startTime.toString(),
                '-t', fourteenMinutes.toString(),
                '-acodec', 'copy',
                outputFilePath
            ];

            try {
                await new Promise<void>((resolve, reject) => {
                    const ffmpegProcess = spawn(ffmpeg!, ffmpegArgs);

                    ffmpegProcess.stdout.on('data', (data) => {
                        console.log(`ffmpeg stdout: ${data}`);
                    });

                    ffmpegProcess.stderr.on('data', (data) => {
                        console.error(`ffmpeg stderr: ${data}`);
                    });

                    ffmpegProcess.on('close', (code) => {
                        if (code === 0) {
                            console.log(`ffmpeg process exited with code ${code}`);
                            resolve();
                        } else {
                            console.error(`ffmpeg process exited with code ${code}`);
                            reject(new Error(`ffmpeg process exited with code ${code}`));
                        }
                    });

                    ffmpegProcess.on('error', (err) => {
                        console.error('Failed to start ffmpeg process.', err);
                        reject(err);
                    });
                });

                console.log(`Uploading chunk ${i + 1} to GridFS...`);
                const uploadStream = bucket.openUploadStream(outputFilePath);
                const fileStream = fs.createReadStream(outputFilePath);
                
                await new Promise<void>((resolve, reject) => {
                    fileStream.pipe(uploadStream)
                        .on('finish', () => {
                            chunkIds.push(uploadStream.id);
                            console.log(`Chunk ${i + 1} uploaded with ID: ${uploadStream.id}`);
                            resolve();
                        })
                        .on('error', (error) => {
                            console.error(`Error uploading chunk ${i + 1}:`, error);
                            reject(error);
                        });
                });

            } finally {
                if (fs.existsSync(outputFilePath)) {
                    fs.unlinkSync(outputFilePath);
                    console.log(`Deleted temporary chunk file: ${outputFilePath}`);
                }
            }
        }
    } else {
        console.log("Audio is less than 15 minutes, uploading directly.");
        const uploadStream = bucket.openUploadStream(filePath);
        const fileStream = fs.createReadStream(filePath);
        
        await new Promise<void>((resolve, reject) => {
            fileStream.pipe(uploadStream)
                .on('finish', () => {
                    chunkIds.push(uploadStream.id);
                    console.log(`File uploaded with ID: ${uploadStream.id}`);
                    resolve();
                })
                .on('error', (error) => {
                    console.error("Error uploading file:", error);
                    reject(error);
                });
        });
    }
    console.log("Audio processing complete.");
    return chunkIds;
};