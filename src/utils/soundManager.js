import { Audio } from 'expo-av';

let soundObject  = null;
let isPlaying    = false;
let isLoading    = false;

let clickSoundObject = null;
let clickSoundLoading = false;

async function configureAudioSession() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS:         false,
    staysActiveInBackground:    true,
    playsInSilentModeIOS:       true,   
    shouldDuckAndroid:          false,
    playThroughEarpieceAndroid: false,
  });
}

export async function playClickSound() {
  if (clickSoundLoading) return;
  try {
    clickSoundLoading = true;
    await configureAudioSession();

    if (!clickSoundObject) {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/click.mp3'),
        { shouldPlay: false, volume: 1.0 }
      );
      clickSoundObject = sound;
    }
    await clickSoundObject.setPositionAsync(0);
    await clickSoundObject.playAsync();
  } catch (e) {
  } finally {
    clickSoundLoading = false;
  }
}

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
    }
  } catch (e) {
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
    }
    isPlaying = false;
  } catch (e) {
  }
}

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

  } catch (e) {
  }
}

export async function unloadOrderSound() {
  try {
    if (soundObject) {
      await soundObject.stopAsync().catch(() => {});
      await soundObject.unloadAsync().catch(() => {});
      soundObject = null;
      isPlaying   = false;
      isLoading   = false;
    }
    if (clickSoundObject) {
      await clickSoundObject.stopAsync().catch(() => {});
      await clickSoundObject.unloadAsync().catch(() => {});
      clickSoundObject  = null;
    }
  } catch (e) {
  }
}