// utils/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase configuration with direct values
const firebaseConfig = {
  apiKey: "AIzaSyDY9RyKyjOxzQ7fU1mMn22riMeIyL_KlDc",
  authDomain: "partner-console-sandbox.firebaseapp.com",
  databaseURL: "https://partner-console-sandbox-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "partner-console-sandbox",
  appId: "1:1025748391482:web:26b63ccce1e750bdae4703",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { app, database };
