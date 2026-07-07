"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const BAR_COUNT = 5;
const SILENT_LEVELS = Array.from({ length: BAR_COUNT }, () => 0.12);

function getSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;

  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function microphoneErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Microphone access denied. Allow microphone access in your browser settings and try again.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No microphone found. Connect a microphone and try again.";
      case "NotReadableError":
      case "TrackStartError":
        return "Microphone is in use by another app. Close it and try again.";
      case "SecurityError":
        return "Microphone access is blocked on this page. Use HTTPS or localhost.";
      case "AbortError":
        return "Microphone request was cancelled.";
      default:
        return error.message || "Could not access microphone.";
    }
  }

  return error instanceof Error ? error.message : "Could not access microphone.";
}

function speechRecognitionErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access denied. Allow microphone access in your browser settings and try again.";
    case "no-speech":
      return "No speech detected. Try speaking closer to your microphone.";
    case "audio-capture":
      return "Could not capture audio from your microphone.";
    case "network":
      return "Speech recognition requires an internet connection.";
    case "aborted":
      return "Voice input was cancelled.";
    default:
      return "Speech recognition failed. Try again.";
  }
}

function joinText(base: string, addition: string): string {
  const left = base.trimEnd();
  const right = addition.trim();
  if (!right) return left;
  if (!left) return right;
  return `${left} ${right}`;
}

export type VoiceInputCallbacks = {
  onLiveUpdate: (displayText: string) => void;
  onComplete: (spokenText: string) => void;
  onError?: (message: string) => void;
};

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(SILENT_LEVELS);
  const [supportsLiveTranscription, setSupportsLiveTranscription] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const wantsRecordingRef = useRef(false);
  const callbacksRef = useRef<VoiceInputCallbacks | null>(null);
  const baseTextRef = useRef("");
  const sessionTextRef = useRef("");
  const interimTextRef = useRef("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const levelDataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    setSupportsLiveTranscription(Boolean(getSpeechRecognition()));
  }, []);

  const stopLevelMonitor = useCallback(() => {
    if (levelFrameRef.current !== null) {
      cancelAnimationFrame(levelFrameRef.current);
      levelFrameRef.current = null;
    }
    analyserRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    setAudioLevels(SILENT_LEVELS);
  }, []);

  const startLevelMonitor = useCallback((stream: MediaStream) => {
    stopLevelMonitor();

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.7;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    levelDataRef.current = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      const node = analyserRef.current;
      const data = levelDataRef.current;
      if (!node || !data) return;

      node.getByteFrequencyData(data as Uint8Array<ArrayBuffer>);
      const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
      const levels = Array.from({ length: BAR_COUNT }, (_, index) => {
        const start = index * step;
        const slice = data.slice(start, start + step);
        const avg = slice.reduce((sum, value) => sum + value, 0) / slice.length;
        return Math.min(1, avg / 120);
      });

      setAudioLevels(levels);
      levelFrameRef.current = requestAnimationFrame(tick);
    };

    void audioContext.resume();
    levelFrameRef.current = requestAnimationFrame(tick);
  }, [stopLevelMonitor]);

  const releaseStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    stopLevelMonitor();
  }, [stopLevelMonitor]);

  const pushLiveUpdate = useCallback(() => {
    const callbacks = callbacksRef.current;
    if (!callbacks) return;

    const combined = joinText(
      joinText(baseTextRef.current, sessionTextRef.current),
      interimTextRef.current,
    );
    callbacks.onLiveUpdate(combined);
  }, []);

  const resetSession = useCallback(() => {
    sessionTextRef.current = "";
    interimTextRef.current = "";
  }, []);

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.stop();
    recognitionRef.current = null;
  }, []);

  const transcribeBlob = useCallback(async (audio: Blob): Promise<string> => {
    const formData = new FormData();
    const extension = audio.type.includes("mp4")
      ? "m4a"
      : audio.type.includes("ogg")
        ? "ogg"
        : "webm";
    formData.append("audio", audio, `recording.${extension}`);

    const response = await fetch("/api/ai/transcribe", {
      method: "POST",
      body: formData,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof body.error === "string" ? body.error : "Transcription failed");
    }

    if (typeof body.text !== "string" || !body.text.trim()) {
      throw new Error("No speech detected in recording");
    }

    return body.text.trim();
  }, []);

  const stopMediaRecorder = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: mimeType })
          : null;
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  const startMediaRecorder = useCallback((stream: MediaStream) => {
    if (typeof MediaRecorder === "undefined") return;

    const mimeType = pickRecorderMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.start(250);
    mediaRecorderRef.current = recorder;
  }, []);

  const startRecognition = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) return false;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || navigator.language || "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (!transcript) continue;

        if (result.isFinal) {
          sessionTextRef.current = joinText(sessionTextRef.current, transcript);
          interimTextRef.current = "";
        } else {
          interim = joinText(interim, transcript);
        }
      }

      interimTextRef.current = interim;
      pushLiveUpdate();
    };

    recognition.onerror = (event) => {
      if (!wantsRecordingRef.current) return;
      if (event.error === "aborted" || event.error === "no-speech") return;

      const message = speechRecognitionErrorMessage(event.error);
      void (async () => {
        wantsRecordingRef.current = false;
        stopRecognition();
        await stopMediaRecorder();
        releaseStream();
        setIsRecording(false);
        resetSession();
        callbacksRef.current?.onError?.(message);
        callbacksRef.current = null;
      })();
    };

    recognition.onend = () => {
      if (!wantsRecordingRef.current) return;
      try {
        recognition.start();
      } catch {
        // Ignore restart races when stopping.
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    return true;
  }, [pushLiveUpdate, releaseStream, resetSession, stopMediaRecorder, stopRecognition]);

  const startRecording = useCallback(
    async (callbacks: VoiceInputCallbacks, baseText: string) => {
      if (typeof window === "undefined") {
        throw new Error("Voice input is only available in the browser");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone recording is not supported in this browser");
      }

      callbacksRef.current = callbacks;
      baseTextRef.current = baseText;
      resetSession();
      pushLiveUpdate();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      startLevelMonitor(stream);
      startMediaRecorder(stream);

      wantsRecordingRef.current = true;
      const hasLive = startRecognition();
      setSupportsLiveTranscription(hasLive);
      setIsRecording(true);
    },
    [pushLiveUpdate, resetSession, startLevelMonitor, startMediaRecorder, startRecognition],
  );

  const stopRecording = useCallback(async (): Promise<"live" | "fallback" | "empty"> => {
    wantsRecordingRef.current = false;
    stopRecognition();

    const blob = await stopMediaRecorder();
    releaseStream();
    setIsRecording(false);

    const callbacks = callbacksRef.current;
    const spokenText = joinText(sessionTextRef.current, interimTextRef.current).trim();
    resetSession();

    if (spokenText && callbacks) {
      callbacks.onComplete(spokenText);
      callbacksRef.current = null;
      return "live";
    }

    if (blob && blob.size > 0) {
      setIsTranscribing(true);
      try {
        const text = await transcribeBlob(blob);
        callbacks?.onComplete(text);
        callbacksRef.current = null;
        return "fallback";
      } finally {
        setIsTranscribing(false);
      }
    }

    callbacksRef.current = null;
    return "empty";
  }, [releaseStream, resetSession, stopMediaRecorder, stopRecognition, transcribeBlob]);

  const toggleRecording = useCallback(
    async (
      callbacks: VoiceInputCallbacks,
      baseText: string,
    ): Promise<"started" | "completed" | "empty" | null> => {
      if (isTranscribing) return null;

      if (isRecording) {
        const result = await stopRecording();
        if (result === "empty") return "empty";
        return "completed";
      }

      try {
        await startRecording(callbacks, baseText);
        return "started";
      } catch (error) {
        wantsRecordingRef.current = false;
        stopRecognition();
        await stopMediaRecorder();
        releaseStream();
        setIsRecording(false);
        callbacksRef.current = null;
        resetSession();
        throw new Error(microphoneErrorMessage(error));
      }
    },
    [
      isRecording,
      isTranscribing,
      releaseStream,
      resetSession,
      startRecording,
      stopMediaRecorder,
      stopRecognition,
      stopRecording,
    ],
  );

  useEffect(() => {
    return () => {
      wantsRecordingRef.current = false;
      stopRecognition();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      releaseStream();
      callbacksRef.current = null;
    };
  }, [releaseStream, stopRecognition]);

  return {
    isRecording,
    isTranscribing,
    isBusy: isRecording || isTranscribing,
    audioLevels,
    supportsLiveTranscription,
    toggleRecording,
  };
}
