// services/firebase.ts
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAfezSHeHCqWVKj8RpHTUk5LfvQeiDDtl0",
  authDomain: "obra-app-5d762.firebaseapp.com",
  projectId: "obra-app-5d762",
  storageBucket: "obra-app-5d762.firebasestorage.app",
  messagingSenderId: "18461850708",
  appId: "1:18461850708:web:73f8a012b984bedc0e41c1",
};

export const firebaseApp = initializeApp(firebaseConfig);

export const firebaseAuth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
