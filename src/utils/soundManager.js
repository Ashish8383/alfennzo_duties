// src/utils/soundManager.js
// Manages the looping ordercoming.mp3 alert sound.
// Sound plays ONLY when pending orders exist. Stops when pending = 0.
import { Audio } from 'expo-av';

let soundObject  = null;
let isPlaying    = false;
let isLoading    = false;

// ─── Internal: configure audio session ───────────────────────────────────────
async function configureAudioSession() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS:         false,
    staysActiveInBackground:    true,
    playsInSilentModeIOS:       true,   // play even on silent switch
    shouldDuckAndroid:          false,
    playThroughEarpieceAndroid: false,
  });
}

// ─── Start looping sound ──────────────────────────────────────────────────────
export async function startOrderSound() {
  if (isPlaying || isLoading) return;
  isLoading = true;

  try {
    await configureAudioSession();

    if (!soundObject) {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/ordercoming.mp3'),
        { isLooping: true, volume: 1.0, shouldPlay: false }
      );
      soundObject = sound;
    }

    const status = await soundObject.getStatusAsync();
    if (!status.isPlaying) {
      await soundObject.setIsLoopingAsync(true);
      await soundObject.playAsync();
      isPlaying = true;
      console.log('[SoundManager] ▶ ordercoming.mp3 started (loop)');
    }
  } catch (e) {
    console.warn('[SoundManager] startOrderSound error:', e);
    isPlaying = false;
  } finally {
    isLoading = false;
  }
}

// ─── Stop looping sound ───────────────────────────────────────────────────────
export async function stopOrderSound() {
  if (!soundObject) return;
  try {
    const status = await soundObject.getStatusAsync();
    if (status.isPlaying) {
      await soundObject.stopAsync();
      await soundObject.setPositionAsync(0);
      console.log('[SoundManager] ■ ordercoming.mp3 stopped');
    }
    isPlaying = false;
  } catch (e) {
    console.warn('[SoundManager] stopOrderSound error:', e);
  }
}

// ─── Play once (for foreground FCM notifications) ────────────────────────────
// Plays ordercoming.mp3 a single time without interrupting the loop state.
export async function playOnce() {
  try {
    await configureAudioSession();

    const { sound } = await Audio.Sound.createAsync(
      require('../assets/ordercoming.mp3'),
      { isLooping: false, volume: 1.0, shouldPlay: true }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });

    console.log('[SoundManager] ▶ ordercoming.mp3 played once (notification)');
  } catch (e) {
    console.warn('[SoundManager] playOnce error:', e);
  }
}

// ─── Full cleanup (on logout / unmount) ──────────────────────────────────────
export async function unloadOrderSound() {
  try {
    if (soundObject) {
      await soundObject.stopAsync().catch(() => {});
      await soundObject.unloadAsync().catch(() => {});
      soundObject = null;
      isPlaying   = false;
      isLoading   = false;
      console.log('[SoundManager] unloaded');
    }
  } catch (e) {
    console.warn('[SoundManager] unloadOrderSound error:', e);
  }
}