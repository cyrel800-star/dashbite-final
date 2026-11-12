import { useEffect, useState } from "react";
import { burger, chicken, noodles, pizza } from "../data/images.js";

// Defaults and storage keys shared between all role-based demo portals.
export const INITIAL_MENU = [
  { id: "food-burger", name: "Burger Classic", price: 120, category: "Burgers", image: burger, available: true },
  { id: "food-pizza", name: "Pizza Pepperoni", price: 180, category: "Pizza", image: pizza, available: true },
  { id: "food-noodles", name: "Chicken Noodles", price: 150, category: "Noodles", image: noodles, available: true },
  { id: "food-wings", name: "Chicken Wings", price: 200, category: "Chicken", image: chicken, available: true },
];

export const LOCAL_KEYS = {
  menu: "dashbite.local.menu",
  orders: "dashbite.local.orders",
  favorites: "dashbite.local.favorites",
  reviews: "dashbite.local.reviews",
  messages: "dashbite.local.messages",
  featureImages: "dashbite.local.featureImages",
  preferences: "dashbite.local.preferences",
  accounts: "dashbite.local.accounts",
};

export const getProfileKey = (role, email) => `dashbite.profile.${role}.${email.trim().toLowerCase()}`;

// Report local-storage failures through both the console and the app toaster.
function reportStorageError(message) {
  console.error(message);
  window.dispatchEvent(new CustomEvent("dashbite:toast", { detail: message }));
}

// Read and write JSON records in this browser without hiding save failures.
export function readLocalData(key, fallback) {
  let raw;
  try {
    raw = window.localStorage.getItem(key);
  } catch (error) {
    reportStorageError("This browser does not allow access to local storage. Enable it and reload the page.");
    return fallback;
  }
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    reportStorageError(`Saved ${key} data could not be read. Reset it from Settings and try again.`);
    return fallback;
  }
}

export function writeLocalData(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    reportStorageError("Could not save your changes in this browser. Free storage space and try again.");
    throw error;
  }
}

// Keep React state synchronized with local storage and surface quota errors.
export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => readLocalData(key, initialValue));
  useEffect(() => {
    try {
      writeLocalData(key, value);
    } catch {
      // The save helper has already reported the storage error to the user.
    }
  }, [key, value]);
  return [value, setValue];
}

// Sync array data changed in another tab and report malformed updates to its owner.
export function useLocalArraySync(key, setValue, setError, logMessage, errorMessage) {
  useEffect(() => {
    const sync = (event) => {
      if (event.key !== key) return;
      if (event.newValue === null) {
        setValue([]);
        setError("");
        return;
      }
      try {
        const latestValue = JSON.parse(event.newValue);
        if (!Array.isArray(latestValue)) throw new Error("Saved data is not a list.");
        setValue(latestValue);
        setError("");
      } catch (error) {
        console.error(logMessage, error);
        setError(errorMessage);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key, setValue, setError, logMessage, errorMessage]);
}

// Validate and resize user-selected images before storing them as compact JPEGs.
export function readLocalImage(file, { maxBytes = 8 * 1024 * 1024 } = {}) {
  const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!acceptedTypes.includes(file.type)) {
    return Promise.reject(new Error("Choose a JPG, PNG or WEBP image."));
  }
  if (file.size > maxBytes) {
    return Promise.reject(new Error("Choose an image smaller than 8 MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("The selected file is not a valid image."));
      image.onload = () => {
        const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Your browser could not process this image."));
          return;
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
