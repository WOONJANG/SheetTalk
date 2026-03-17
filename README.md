# SheetTalk Starter

Google Sheets + Apps Script + GitHub Pages 조합으로 만드는 초경량 채팅 프로젝트입니다.

## 포함 파일

- `backend/Code.gs`: Apps Script 백엔드
- `frontend/index.html`: 메인 화면
- `frontend/style.css`: UI 스타일
- `frontend/app.js`: 프론트 로직
- `frontend/config.js`: Apps Script 웹앱 URL 연결 파일

## 1) Google Sheets 준비

새 구글 스프레드시트를 만든 뒤 ID를 복사합니다.

## 2) Apps Script 준비

1. 스프레드시트에서 **확장 프로그램 → Apps Script** 열기
2. `Code.gs` 전체 붙여넣기
3. `PUT_YOUR_SPREADSHEET_ID_HERE`를 실제 시트 ID로 변경
4. 저장 후 `initializeChatSheets_()` 또는 아무 GET 호출 전에 웹앱 배포
5. **배포 → 새 배포 → 유형: 웹 앱**
   - 실행 사용자: 나
   - 액세스 권한: 링크가 있는 모든 사용자
6. 배포 URL 복사

## 3) GitHub Pages 준비

1. `frontend/` 안 파일들을 저장소 루트 또는 `/docs`에 업로드
2. `config.js`에서 `PUT_YOUR_APPS_SCRIPT_WEBAPP_URL_HERE`를 Apps Script 배포 URL로 변경
3. GitHub Pages 활성화

## 4) 사용 흐름

1. 사용자 추가
2. 보내는 사람 선택
3. 친구 추가
4. 1:1 또는 단체방 생성
5. 메시지 전송

## 주의사항

- 이 구조는 **가벼운 내부용 / 데모용**에 적합합니다.
- 인증 없이 "보내는 사람"만 선택하는 방식이라 **보안 채팅용으로는 부적합**합니다.
- GitHub Pages는 정적 호스팅이므로 실시간 소켓 대신 **주기적 폴링**으로 새 메시지를 반영합니다.
- 메시지가 많아지면 Google Sheets 특성상 느려질 수 있습니다.
