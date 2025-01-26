import fs from 'fs';
import { Transform } from 'stream';
import player from 'play-sound';
import OpenAi from 'openai';
import { spawn } from 'child_process';

export class AudioManager {
  constructor() {}

  /**
   * Play an audio file.
   * @param filePath - Path to the audio file to play.
   */
  static async playAudio(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioPlayer = player();
      audioPlayer.play(filePath, (err) => {
        if (err) {
          console.error('Error playing audio:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async recordAudio(outputPath: string): Promise<void> {
    if (!outputPath) {
      throw new Error('Output path must be provided');
    }
    // console.log(outputPath);

    return new Promise((resolve, reject) => {
      const soxProcess = spawn('sox', [
        '-t',
        'coreaudio',
        'default',
        outputPath,
        'silence',
        '1',
        '0.1',
        '1%',
        '1',
        '2.0',
        '1%',
      ]);

      soxProcess.on('close', (code) => {
        if (code === 0) {
          console.log('⏹️ Gravação terminada');
          resolve();
        } else {
          reject(new Error(`sox process exited with code ${code}`));
        }
      });
    });
  }
}
/**
 * SilenceDetector: Detects silence based on a threshold and duration.
 */
class SilenceDetector extends Transform {
  private threshold: number;
  private silenceDuration: number;
  private lastSoundTime: number;

  constructor(threshold: number, silenceDuration: number) {
    super();
    this.threshold = threshold;
    this.silenceDuration = silenceDuration;
    this.lastSoundTime = Date.now();
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error, data?: Buffer) => void,
  ) {
    const now = Date.now();

    // Calculate RMS (Root Mean Square) for audio volume
    const rms =
      Math.sqrt(
        chunk.reduce((sum, value) => sum + value * value, 0) / chunk.length,
      ) / 32768;

    console.log(`Current RMS: ${rms}`); // Log the RMS value

    if (rms > this.threshold) {
      this.lastSoundTime = now;
      console.log('Sound detected.');
    }

    if (now - this.lastSoundTime > this.silenceDuration) {
      console.log('Silence duration exceeded.');
      this.emit('silence');
    }

    callback(null, chunk);
  }
}

const openai = new OpenAi({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSpeech(input: string) {
  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'nova',
    input,
  });
  // console.log('response', response);
  const buffer = Buffer.from(await response.arrayBuffer());
  const base64String = buffer.toString('base64');
  const fileName = './tmp/' + Date.now() + '-audio.mp3';
  fs.writeFileSync(fileName, base64String, 'base64');
  return fileName;
}

export async function audioToText(filename: string) {
  const audioFile: fs.ReadStream = fs.createReadStream(filename);
  const transcriptionResponse: any = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'pt',
  });
  return transcriptionResponse.text;
}
