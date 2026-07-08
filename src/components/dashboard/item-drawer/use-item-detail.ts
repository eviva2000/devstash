"use client";

import { useEffect, useRef, useState } from "react";

import type { ItemDetail, ItemDetailResponse } from "./types";

type LoadError = {
  itemId: string;
  message: string;
};

/**
 * Loads an item's full detail from the API when the drawer is opened for a
 * given id. Aborts in-flight requests when the id changes or the drawer
 * closes, and exposes the detail that matches the currently requested id.
 */
export function useItemDetail({
  isOpen,
  itemId,
  onLoad,
}: {
  isOpen: boolean;
  itemId: string | null;
  onLoad?: (item: ItemDetail) => void;
}) {
  const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);
  const [loadError, setLoadError] = useState<LoadError | null>(null);

  const onLoadRef = useRef(onLoad);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    if (!isOpen || !itemId) {
      return;
    }

    const controller = new AbortController();
    const currentItemId = itemId;

    async function fetchItemDetail() {
      try {
        const response = await fetch(
          `/api/items/${encodeURIComponent(currentItemId)}`,
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }
        );
        const payload = (await response.json()) as ItemDetailResponse;

        if (!response.ok || !payload.item) {
          throw new Error(payload.error ?? "Unable to load item details.");
        }

        setItemDetail(payload.item);
        setLoadError(null);
        onLoadRef.current?.(payload.item);
      } catch (fetchError) {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setLoadError({
          itemId: currentItemId,
          message:
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load item details.",
        });
      }
    }

    void fetchItemDetail();

    return () => controller.abort();
  }, [isOpen, itemId]);

  const activeDetail = itemDetail?.id === itemId ? itemDetail : null;
  const activeError = loadError?.itemId === itemId ? loadError.message : null;
  const isLoading = isOpen && Boolean(itemId) && !activeDetail && !activeError;

  return { activeDetail, activeError, isLoading, setItemDetail };
}
