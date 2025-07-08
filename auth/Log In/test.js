import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDp3Ud5V45D60_-uZYPw2Y9hbqoZg7erlo",
  authDomain: "expense-tracker-1085e.firebaseapp.com",
  projectId: "expense-tracker-1085e",
  storageBucket: "expense-tracker-1085e.appspot.com",
  messagingSenderId: "1036770015354",
  appId: "1:1036770015354:web:017c9f6298dcadf0e723c3",
  measurementId: "G-7Q1MS1B5XP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

document.getElementById('loginForm').addEventListener("submit", function(event){
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert("Signed in successfully!");
      window.location.href = "/Frontend/Dashboard/test.html"; // or your dashboard page
    })
    .catch((error) => {
      alert(error.message);
    });
});
