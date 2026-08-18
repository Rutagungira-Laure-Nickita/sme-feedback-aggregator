export type CollectionView = "list" | "grid";

export const COLLECTION_VIEW_STORAGE_PREFIX = "sme-collection-view:";
export const LARGE_COLLECTION_MEDIA = "(min-width: 1024px)";

export function getDefaultCollectionView(
  isLargeScreen: boolean,
  itemCount: number
): CollectionView {
  return isLargeScreen && itemCount === 1 ? "list" : "grid";
}

export function isCollectionView(value: unknown): value is CollectionView {
  return value === "list" || value === "grid";
}
