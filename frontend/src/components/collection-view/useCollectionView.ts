import { useCallback, useEffect, useState } from "react";
import {
  COLLECTION_VIEW_STORAGE_PREFIX,
  getDefaultCollectionView,
  isCollectionView,
  LARGE_COLLECTION_MEDIA,
  type CollectionView
} from "./collection-view.js";

function resolveView(storageKey: string, itemCount: number): CollectionView {
  if (typeof window === "undefined") return "grid";
  const saved = window.localStorage.getItem(storageKey);
  if (isCollectionView(saved)) return saved;
  return getDefaultCollectionView(
    window.matchMedia(LARGE_COLLECTION_MEDIA).matches,
    itemCount
  );
}

export function useCollectionView(pageKey: string, itemCount: number) {
  const storageKey = `${COLLECTION_VIEW_STORAGE_PREFIX}${pageKey}`;
  const [view, setViewState] = useState<CollectionView>(() =>
    resolveView(storageKey, itemCount)
  );

  useEffect(() => {
    const media = window.matchMedia(LARGE_COLLECTION_MEDIA);
    const applyAutomaticView = () => {
      if (!isCollectionView(window.localStorage.getItem(storageKey))) {
        setViewState(getDefaultCollectionView(media.matches, itemCount));
      }
    };
    applyAutomaticView();
    media.addEventListener("change", applyAutomaticView);
    return () => media.removeEventListener("change", applyAutomaticView);
  }, [itemCount, storageKey]);

  const setView = useCallback(
    (nextView: CollectionView) => {
      window.localStorage.setItem(storageKey, nextView);
      setViewState(nextView);
    },
    [storageKey]
  );

  return { view, setView };
}
