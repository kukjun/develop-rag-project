# Medical RAG Backend (Express + TypeScript)

의료 RAG 시스템의 백엔드 API 서버입니다.

## 설치

```bash
npm install
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
OPENAI_API_KEY=your_openai_api_key
PGVECTOR_HOST=localhost
PGVECTOR_PORT=5433
PGVECTOR_USER=postgres
PGVECTOR_PASSWORD=password
PGVECTOR_DATABASE=medical_rag
PORT=3001
```

## 실행

### 개발 모드
```bash
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
npm start
```

## API 엔드포인트

### POST /api/chat/default
Default mode - 직접 검색 방식 (Streaming)

**Request:**
```json
{
  "query": "당뇨병의 증상은 무엇인가요?"
}
```

**Response:** Server-Sent Events (SSE) 스트리밍

### POST /api/chat/agent
AI Agent mode - Tool 사용 방식 (Streaming)

**Request:**
```json
{
  "query": "당뇨병의 증상은 무엇인가요?"
}
```

**Response:** Server-Sent Events (SSE) 스트리밍

### GET /health
헬스 체크

**Response:**
```json
{
  "status": "ok"
}
```

## 기술 스택

- Express.js
- TypeScript
- LangChain
- OpenAI
- PGVector
