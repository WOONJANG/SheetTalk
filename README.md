# SheetTalk Starter v2

Google Sheets + Apps Script + GitHub Pages 조합으로 만드는 로그인형 채팅 프로젝트입니다.

## 포함 파일

- `backend/Code.gs`: Apps Script 백엔드
- `frontend/index.html`: 로그인/회원가입 + 채팅 UI
- `frontend/style.css`: 모바일/PC 반응형 스타일
- `frontend/app.js`: 프론트 로직
- `frontend/config.js`: Apps Script 웹앱 URL 연결 파일

## 구현된 기능

- 회원가입
  - 아이디
  - 비밀번호
  - 이름
  - 핸드폰번호
- 로그인 / 로그아웃
- 친구 추가(아이디 검색)
- 1:1 채팅방 생성
- 단체 채팅방 생성
- 멤버 초대
- 메시지 전송
- 내 메시지 읽음 표시

## 1) Google Sheets 준비

새 구글 스프레드시트를 만든 뒤 ID를 복사합니다.

## 2) Apps Script 준비

1. 스프레드시트에서 **확장 프로그램 → Apps Script** 열기
2. `Code.gs` 전체 붙여넣기
3. `PUT_YOUR_SPREADSHEET_ID_HERE`를 실제 시트 ID로 변경
4. 저장 후 **배포 → 새 배포 → 유형: 웹 앱**
   - 실행 사용자: 나
   - 액세스 권한: 링크가 있는 모든 사용자
5. 배포 URL 복사

초기 실행 시 아래 시트가 자동 생성됩니다.

- `users`
- `friendships`
- `rooms`
- `room_members`
- `messages`
- `reads`
- `sessions`

## 3) GitHub Pages 준비

1. `frontend/` 안 파일들을 저장소 루트 또는 `/docs`에 업로드
2. `config.js`에서 `PUT_YOUR_APPS_SCRIPT_WEBAPP_URL_HERE`를 Apps Script 배포 URL로 변경
3. GitHub Pages 활성화

## 4) 사용 흐름

1. 회원가입
2. 로그인
3. 친구 추가(아이디 검색)
4. 1:1 또는 단체 채팅방 생성
5. 메시지 전송
6. 방을 열면 읽음 상태가 갱신됨

## 주의사항

- 이 구조는 **소규모 내부용 / 데모용**에 적합합니다.
- Apps Script와 Google Sheets를 저장소처럼 쓰는 방식이라 사용자가 많아지면 느려질 수 있습니다.
- 비밀번호는 평문이 아니라 해시로 저장되지만, 이 프로젝트는 어디까지나 **간이형 메신저**입니다.
- GitHub Pages는 정적 호스팅이므로 **실시간 소켓이 아니라 폴링 방식**으로 새 메시지를 가져옵니다.
- 운영용으로 키우려면 Firebase Auth / Firestore 같은 구조로 옮기는 편이 훨씬 낫습니다.
