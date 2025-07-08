// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDp3Ud5V45D60_-uZYPw2Y9hbqoZg7erlo",
  authDomain: "expense-tracker-1085e.firebaseapp.com",
  projectId: "expense-tracker-1085e",
  storageBucket: "expense-tracker-1085e.firebasestorage.app",
  messagingSenderId: "1036770015354",
  appId: "1:1036770015354:web:017c9f6298dcadf0e723c3",
  measurementId: "G-7Q1MS1B5XP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

const submit = document.getElementById('submit');

submit.addEventListener("click", function(event){
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up 
      const user = userCredential.user;
      alert("Creating Account")
      window.location.href="grand.html";
      // ...
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      alert(errorMessage)
      // ..
    });
});
