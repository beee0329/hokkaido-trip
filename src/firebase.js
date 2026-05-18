// Firebase 初始化
// 這個檔案負責啟動 Firebase 並匯出 Firestore 資料庫物件給 App 使用
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCt0l0tv8lsgwVHO3BpDW9kK0LtVm5zDG4',
  authDomain: 'hokkaido-trip-3145e.firebaseapp.com',
  projectId: 'hokkaido-trip-3145e',
  storageBucket: 'hokkaido-trip-3145e.firebasestorage.app',
  messagingSenderId: '167426855070',
  appId: '1:167426855070:web:8e4a5230f108344b8d2b8f',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
