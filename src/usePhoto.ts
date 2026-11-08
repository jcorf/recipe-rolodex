import { useEffect, useState } from 'react';
import { api } from './api';
import { makePhoto, type PhotoSize } from './photos';

/** Kept photos as addresses the page can show, made once per visit and shared by every card that asks. */
const urls = new Map<string, Promise<string | null>>();

export function photoUrl(id: string, size: PhotoSize): Promise<string | null> {
  const key = `${id}:${size}`;
  if (!urls.has(key)) {
    urls.set(key, api.photo(id, size).then((blob) => (blob ? URL.createObjectURL(blob) : null)).catch(() => null));
  }
  return urls.get(key)!;
}

/** A photo picked on this device: shrunk, kept, and its id handed back for the card. */
export async function addPhoto(file: File): Promise<string> {
  return api.savePhoto(await makePhoto(file));
}

/**
 * What to show for a card's photo: one added from this device if it has one, otherwise its web
 * photo link, otherwise nothing ('').
 */
export function usePhotoSrc(recipe: { photo?: string; image?: string }, size: PhotoSize): string {
  const { photo, image = '' } = recipe;
  // undefined while a kept photo is being read; null when it's missing (fall back to the link)
  const [kept, setKept] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!photo) return;
    let alive = true;
    photoUrl(photo, size).then((url) => alive && setKept(url));
    return () => { alive = false; setKept(undefined); };
  }, [photo, size]);
  if (!photo) return image;
  return kept === undefined ? '' : kept ?? image;
}

/** The same for drawing onto a canvas (shared pictures): a kept photo, or null to use the web link. */
export const keptPhotoUrl = (recipe: { photo?: string }, size: PhotoSize) =>
  recipe.photo ? photoUrl(recipe.photo, size) : Promise.resolve(null);
