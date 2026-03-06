// services/firebase.ts
import {
  getAuth,
  type Auth,
} from "firebase/auth";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAfezSHeHCqWVKj8RpHTUk5LfvQeiDDtl0",
  authDomain: "obra-app-5d762.firebaseapp.com",
  projectId: "obra-app-5d762",
  storageBucket: "obra-app-5d762.firebasestorage.app",
  messagingSenderId: "18461850708",
  appId: "1:18461850708:web:73f8a012b984bedc0e41c1",
};

export const firebaseApp = initializeApp(firebaseConfig);

function createAuth(): Auth {
  return getAuth(firebaseApp);
}

export const firebaseAuth = createAuth();
