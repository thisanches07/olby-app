import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

async function requestPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Downloads a single photo from a URL and saves it to the device gallery.
 * Returns true on success.
 */
export async function savePhotoToGallery(url: string): Promise<boolean> {
  const granted = await requestPermission();
  if (!granted) return false;

  const filename = `obra_${Date.now()}.jpg`;
  const localUri = `${FileSystem.cacheDirectory}${filename}`;

  const { uri } = await FileSystem.downloadAsync(url, localUri);
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}

/**
 * Downloads all photos from a list of URLs and saves them to the device gallery.
 * Returns saved and failed counts.
 */
export async function saveAllPhotosToGallery(
  urls: string[],
): Promise<{ saved: number; failed: number }> {
  if (urls.length === 0) return { saved: 0, failed: 0 };

  const granted = await requestPermission();
  if (!granted) return { saved: 0, failed: urls.length };

  const results = await Promise.allSettled(
    urls.map(async (url, i) => {
      const filename = `obra_${Date.now()}_${i}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      const { uri } = await FileSystem.downloadAsync(url, localUri);
      await MediaLibrary.saveToLibraryAsync(uri);
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return { saved: urls.length - failed, failed };
}
