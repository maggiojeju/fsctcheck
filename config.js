// ===== 수업 설정 =====
// Firebase 설정을 비워 두면 '데모 모드'로 동작합니다(같은 컴퓨터·같은 브라우저의 탭끼리만 연결 — 미리 보기용).
// 실제 수업 전에 Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에서 복사한 값을 붙여 넣으세요.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDiUyDHWD_IapEjiBDdzXMumNX3b3Ml74c",
  authDomain: "factcheck-13925.firebaseapp.com",
  databaseURL: "https://factcheck-13925-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "factcheck-13925",
  appId: "1:551165492778:web:7f351a1a48c569002a8d53"
};

// 교사 화면 입장 비밀번호 (학생이 교사 화면을 실수로 여는 것을 막는 용도)
window.TEACHER_PIN = "1234";

// 반마다 다른 방 코드를 쓰면 데이터가 섞이지 않습니다. 학생 주소: student.html?room=3-2
window.DEFAULT_ROOM = "3-2";
