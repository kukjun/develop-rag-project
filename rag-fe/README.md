# Medical RAG Frontend (Streamlit)

의료 RAG 시스템의 프론트엔드 애플리케이션입니다.

## 설치 및 실행 (uv 사용)

```bash
# 의존성 설치
uv sync

# 실행
uv run streamlit run app.py
```

## 기능

- **Default Mode**: 직접 벡터 검색 방식
- **AI Agent Mode**: Tool을 사용하는 방식
- 실시간 스트리밍 응답
- 대화 히스토리 관리

## 설정

Backend API URL은 `app.py`의 `BACKEND_URL` 변수에서 변경할 수 있습니다.
기본값: `http://localhost:3001`
