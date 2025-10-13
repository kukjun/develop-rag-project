# Medical RAG Project

의료 정보 RAG (Retrieval-Augmented Generation) 시스템

## 빠른 시작 (Quick Start)

### 프로젝트 구조

```
develop-rag-project/
├── medical-rag/          # 원본 RAG 스크립트
├── rag-be/              # Backend API (Express + TypeScript)
└── rag-fe/              # Frontend UI (Streamlit)
```

### 1. Backend 실행

```bash
cd rag-be
npm install
npm run dev
```

Backend 서버가 http://localhost:3001 에서 실행됩니다.

### 2. Frontend 실행

새 터미널을 열고:

```bash
cd rag-fe
uv sync
uv run streamlit run app.py
```

Frontend가 http://localhost:8501 에서 실행됩니다.

### 3. 사용하기

1. 브라우저에서 http://localhost:8501 접속
2. 사이드바에서 모드 선택:
   - **Default Mode**: 직접 벡터 검색 방식
   - **AI Agent Mode**: Tool을 사용하는 방식
3. 질문 입력 (예: "당뇨병의 증상은 무엇인가요?")
4. 실시간 스트리밍으로 답변 확인

## 기능

### Default Mode
- PGVector에서 유사 문서 직접 검색
- 검색된 문서를 컨텍스트로 LLM에 전달
- 의료 관련 질문만 답변

### AI Agent Mode
- LLM이 Tool을 자동으로 사용
- 필요시 retrieve_medical_info 도구로 문서 검색
- 의료 관련 질문 외에도 일반 질문 답변 가능

## 기술 스택

### Backend
- Express.js + TypeScript
- LangChain (OpenAI, PGVector)
- Server-Sent Events (SSE) for streaming

### Frontend
- Streamlit
- Real-time streaming response
- Chat history management

## 환경 변수

`rag-be/.env` 파일:
```env
OPENAI_API_KEY=your_openai_api_key
PGVECTOR_HOST=localhost
PGVECTOR_PORT=5433
PGVECTOR_USER=postgres
PGVECTOR_PASSWORD=password
PGVECTOR_DATABASE=medical_rag
PORT=3001
```

## 요구사항

- Node.js 18+
- Python 3.8+
- PostgreSQL with PGVector extension
- OpenAI API Key

---

# 질병 정보 RAG 시스템 구축 계획

## 프로젝트 개요

**목적**: 포트폴리오용 질병 정보 제공 RAG 시스템  
**범위**: 한국 발생률 기준 7대 암 + 주요 만성질환  
**핵심 기능**: 특정 질병명 입력 시 해당 질병의 예방법, 관리법, 식습관, 생활습관 등 정보 제공

---

## 대상 질병

### 7대 암 (한국 발생률 기준)

1. 위암
2. 대장암
3. 폐암
4. 갑상선암
5. 유방암
6. 간암
7. 전립선암

**총 7개 질병**

---

## 데이터 소스

### 주요 소스 (우선순위 순)

#### 1. 국가암정보센터 (cancer.go.kr)

- **수집 대상**: 7대 암 전체 정보
- **포함 내용**: 원인, 예방, 검진, 치료, 생활관리, 식습관
- **수집 방법**: 웹 크롤링
- **주의사항**: robots.txt 확인, rate limiting 적용

#### 결론

우선 7대 암 기준으로 수집을 진행한다.

---

## 데이터 저장 구조

### Markdown + Frontmatter 방식

**저장 형식**: YAML frontmatter + Markdown 본문

#### 디렉토리 구조

```
data/
├── raw/                          # 스크래핑 원본
│   └── html/
│       ├── stomach_cancer.html
│       └── ...
├── processed/                    # 사람이 검증하는 MD 파일
│   ├── cancers/
│   │   ├── stomach_cancer.md
│   │   ├── colorectal_cancer.md
│   │   ├── lung_cancer.md
│   │   ├── thyroid_cancer.md
│   │   ├── breast_cancer.md
│   │   ├── liver_cancer.md
│   │   └── prostate_cancer.md
│   └── chronic_diseases/
│       ├── hypertension.md
│       ├── diabetes.md
│       ├── dyslipidemia.md
│       ├── obesity.md
│       ├── chronic_kidney_disease.md
│       └── copd.md
└── validation/
    ├── schema.yaml               # frontmatter 검증 스키마
    └── checklist.md             # 수동 검증 체크리스트
```

#### Markdown 파일 형식

**Frontmatter 필수 필드**:

```yaml
---
disease_id: string (영문, snake_case)
disease_name: string (한글 질병명)
disease_name_en: string (영문 질병명)
category: string (cancer | chronic_disease)
source: string (출처 기관명)
source_url: string (원본 URL)
collected_date: date (YYYY-MM-DD)
verified: boolean (검증 완료 여부)
verified_by: string | null (검증자)
verified_date: date | null (검증 날짜)
---
```

**파일 예시**: `stomach_cancer.md`

```markdown
---
disease_id: stomach_cancer
disease_name: 위암
disease_name_en: Stomach Cancer
category: cancer
source: 국가암정보센터
source_url: https://www.cancer.go.kr/lay1/...
collected_date: 2025-10-10
verified: false
verified_by: null
verified_date: null
tags:
  - 소화기암
  - 5대암검진
---

# 위암

## 개요

위암은 위 점막에서 발생하는 악성 종양입니다...

## 원인

### 주요 위험 요인

1. 헬리코박터 파일로리 감염
2. 식습관 (짠 음식, 탄 음식)
3. 흡연

## 예방

### 생활습관

금연은 위암 예방의 첫걸음입니다...

### 식습관

신선한 채소와 과일을 충분히 섭취하세요...
```

**Markdown 작성 규칙**:

- H1 (`#`): 질병명 (파일당 1개)
- H2 (`##`): 주요 섹션 (개요, 원인, 증상, 예방, 치료, 생활관리 등)
- H3 (`###`): 서브섹션
- 각 섹션은 self-contained하게 작성 (맥락 정보 포함)
- 리스트는 명확한 항목이 있을 때만 사용

---

## 구현 로드맵

### Phase 1: 데이터 수집 (1-2주)

#### 작업 내용

1. 크롤링 스크립트 개발
   - BeautifulSoup + Requests (정적 페이지)
   - Selenium (동적 페이지 필요 시)
2. 국가암정보센터에서 7대 암 정보 수집
3. 질병관리청에서 6개 만성질환 정보 수집
4. 보조 소스에서 추가 정보 수집

#### 크롤링 시 주의사항

- robots.txt 확인
- Rate limiting: 1초당 1-2 요청
- User-Agent 설정
- 에러 핸들링 및 재시도 로직
- 수집 날짜 기록

#### 데이터 저장 방식

**1단계**: HTML 원본을 `raw/html/` 디렉토리에 저장 (섹션을 나눌 수 있으면 나누고, 그렇지 않으면 모든 섹션을 하나의 html파일로 유지.)

- 암검진센터는 페이지가 다르므로 다른 값을 가져올 것으로 추측
- **2단계**: HTML → Markdown 변환 후 `processed/` 디렉토리에 저장 (frontmatter 포함)

### Phase 2: 데이터 전처리 & 청킹 (1주)

#### 작업 내용

1. 데이터 정제
   - HTML 태그 제거
   - 특수문자 처리
   - 불필요한 공백 제거
2. 청킹 전략
   - **방식**: 섹션별 청크 (권장)
     - 예: "위암-예방법", "위암-식습관"
3. 메타데이터 설계

   ```python
   metadata = {
       "disease_id": "stomach_cancer",
       "disease_name": "위암",
       "category": "암",
       "section": "prevention",
       "source": "국가암정보센터",
       "url": "https://...",
       "collected_date": "2025-10-10"
   }
   ```

4. 벡터 임베딩 생성

### Phase 3: RAG 파이프라인 구축 (1-2주)

#### 기술 스택 선택

**벡터 데이터베이스**

- Chroma (로컬 개발 용이, 무료)

**임베딩 모델**

- multilingual-e5-large-instruct
- gpt embedding model(text-embedding-3-small)

**LLM**

- Option 1: 오픈소스 모델 (Ollama Gemma3:4b)
- Option 2: Open AI 모델 (GPT-5 nano)

#### RAG 파이프라인 구조

```
사용자 질문
    ↓
질문 임베딩
    ↓
벡터 검색 (Top-K 문서 검색)
    ↓
검색 결과 재정렬 (Reranking, 선택적)
    ↓
컨텍스트 + 질문을 LLM에 전달
    ↓
답변 생성 + 출처 명시
    ↓
사용자에게 반환
```

#### 검색 전략

- **하이브리드 서치 권장**: 벡터 검색 + 키워드 검색 결합
- **메타데이터 필터링**: 질병명으로 먼저 필터링 후 세부 검색
- **Top-K 설정**: 3-5개 문서 검색

#### 프롬프트 엔지니어링

```
당신은 질병 정보를 제공하는 전문 어시스턴트입니다.
다음 규칙을 반드시 지켜주세요:

1. 제공된 컨텍스트 정보만을 기반으로 답변하세요.
2. 의학적 진단이나 처방을 하지 마세요.
3. 항상 "의료 전문가와 상담하세요"를 권고하세요.
4. 출처를 명시하세요.
5. 모르는 내용은 모른다고 답하세요.

컨텍스트:
{retrieved_context}

질문: {user_question}

답변:
```

### Phase 4: UI 개발 & 테스트 (1주)

#### UI 기능

1. 질병 선택 드롭다운 (13개 질병)
2. 질문 입력창
3. 답변 표시 (출처 메타데이터 포함)
4. 면책 문구 상시 표시

#### 답변 생성 로직

```python
from langchain.chains import RetrievalQA
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate

# 프롬프트 템플릿
prompt_template = """당신은 질병 정보를 제공하는 어시스턴트입니다.

규칙:
1. 제공된 컨텍스트만 사용하세요
2. 의학적 진단이나 처방은 하지 마세요
3. 반드시 "의료 전문가와 상담"을 권고하세요
4. 모르면 모른다고 답하세요

컨텍스트:
{context}

질문: {question}

답변:"""

PROMPT = PromptTemplate(
    template=prompt_template,
    input_variables=["context", "question"]
)

# RAG 체인 구성
llm = ChatOpenAI(model_name="gpt-4", temperature=0)

qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=vectorstore.as_retriever(
        search_kwargs={"k": 3}
    ),
    chain_type_kwargs={"prompt": PROMPT},
    return_source_documents=True
)

# 사용
def get_answer(disease_name, question):
    # 질병명 필터링된 retriever 생성
    filtered_retriever = vectorstore.as_retriever(
        search_kwargs={
            "k": 3,
            "filter": {"disease_name": disease_name}
        }
    )

    qa_chain.retriever = filtered_retriever
    result = qa_chain({"query": question})

    return {
        "answer": result["result"],
        "sources": [
            {
                "section": doc.metadata.get("section", ""),
                "subsection": doc.metadata.get("subsection", ""),
                "source": doc.metadata.get("source", ""),
                "url": doc.metadata.get("source_url", "")
            }
            for doc in result["source_documents"]
        ]
    }
```

#### 면책 문구

```
⚠️ 주의사항
이 정보는 참고용이며 의료 전문가의 진단이나 치료를 대체할 수 없습니다.
증상이 있거나 치료가 필요한 경우 반드시 의사와 상담하세요.

📋 정보 출처: {source}
📅 수집 날짜: {collected_date}
```

#### 테스트 케이스 예시

**위암**

- "위암 예방을 위한 식습관은?"
- "위암 환자는 어떤 음식을 피해야 하나요?"
- "위암 검진은 언제 받아야 하나요?"

**당뇨병**

- "당뇨병 예방 방법은?"
- "당뇨병 환자의 운동 가이드는?"
- "당뇨병에 좋은 음식은?"

각 질병당 3-5개씩 총 40-60개 테스트 케이스 준비

---

## 리스크 관리

### 법적 리스크

**리스크**: 의료 정보 오류 시 법적 책임
**대응**:

- 명확한 면책 문구 표시
- "진단/처방 아님" 명시
- 공식 출처만 사용
- 정보 출처 항상 명시

### 저작권 리스크

**리스크**: 크롤링한 콘텐츠 저작권 문제
**대응**:

- 공공기관 정보 우선 사용
- 출처 명시 및 링크 제공
- 포트폴리오용임을 명시
- 상용화 시 별도 확인 필요

### 기술적 리스크

**리스크**: RAG 답변 정확도 문제
**대응**:

- 검색 품질 평가 (Precision, Recall)
- 답변 품질 평가 (Faithfulness, Relevance)
- 출처 명시로 검증 가능성 제공
- "모르겠다"고 답하는 기능

### 정보 신선도 리스크

**리스크**: 의료 정보 업데이트
**대응**:

- 수집 날짜 표시
- "정보는 YYYY-MM-DD 기준" 명시
- (선택) 자동 업데이트 파이프라인

---

## 포트폴리오 어필 포인트

### 기술적 역량

1. **데이터 엔지니어링**: 웹 크롤링, 데이터 전처리, 구조화
2. **RAG 시스템 구축**: 벡터 DB, 임베딩, 검색 최적화
3. **프롬프트 엔지니어링**: LLM 활용 최적화
4. **전체 파이프라인 구현**: End-to-End 시스템

### 도메인 이해

1. **리스크 관리**: 의료 정보 특성 이해 및 대응
2. **사용자 안전**: 면책, 출처 명시 등 윤리적 고려
3. **신뢰도 확보**: 공식 출처 사용, 검증 가능성

### 차별화

1. **한국어 특화**: 국내 공식 의료 정보 활용
2. **구조화된 접근**: 체계적인 데이터 수집 및 관리
3. **실용성**: 실제 사용 가능한 수준의 완성도

---

## 예상 타임라인

| Phase   | 작업 내용             | 기간  | 누적  |
| ------- | --------------------- | ----- | ----- |
| Phase 1 | 데이터 수집 & MD 변환 | 1-2주 | 1-2주 |
| Phase 2 | 수동 검증             | 1주   | 2-3주 |
| Phase 3 | RAG 파이프라인        | 1-2주 | 3-5주 |
| Phase 4 | UI & 테스트           | 1주   | 4-6주 |

**총 예상 기간**: 4-6주

---

## 기술 스택 요약

### 데이터 수집

- **크롤링**: BeautifulSoup, Requests
- **HTML → MD 변환**: python-markdown, html2text
- **Frontmatter 처리**: python-frontmatter

### RAG 파이프라인

- **프레임워크**: LangChain
- **벡터 DB**: pgVector
- **임베딩**: OpenAI text-embedding-
- **LLM**: OpenAI GPT-4 또는 Claude
- **Text Splitter**: MarkdownHeaderTextSplitter + RecursiveCharacterTextSplitter

### 검증

- **자동 검증**: Python 스크립트
- **수동 검증**: 체크리스트 기반

---

## 데이터 워크플로우 요약

```
웹 스크래핑
    ↓
raw/html/*.html 저장
    ↓
HTML → Markdown 변환
    ↓
Frontmatter 자동 생성
    ↓
processed/*.md 저장
    ↓
자동 검증 스크립트 실행
    ↓
사람이 MD 파일 검토/수정
    ↓
검증 완료 표시 (verified: true)
    ↓
LangChain Document 로드
    ↓
MarkdownHeaderTextSplitter로 섹션 분할
    ↓
RecursiveCharacterTextSplitter로 추가 분할
    ↓
Chroma 벡터 DB 저장
    ↓
RAG 검색 & 답변 생성
```

---

## 다음 단계

1. **환경 설정**

   ```bash
   pip install langchain openai chromadb python-frontmatter
   pip install beautifulsoup4 requests html2text
   ```

2. **크롤링 스크립트 개발**

   - 국가암정보센터 robots.txt 확인
   - 1-2개 질병으로 테스트

3. **Markdown 템플릿 확정**

   - Frontmatter 필드 최종 확정
   - 섹션 구조 표준화

4. **검증 프로세스 구축**
   - 자동 검증 스크립트 작성
   - 체크리스트 작성

---

## 포트폴리오 어필 포인트

### 기술적 역량

1. **End-to-End 파이프라인**: 데이터 수집 → 전처리 → RAG 구축 → UI
2. **LangChain 활용**: Document 로딩, Text Splitting, 벡터 검색
3. **Frontmatter 기반 메타데이터 관리**: 구조화된 데이터 관리
4. **사람-기계 협업**: 자동화 + 수동 검증 프로세스

### 도메인 이해

1. **의료 정보 특성 이해**: 신뢰도, 출처, 면책 처리
2. **리스크 관리**: 법적/윤리적 고려사항 반영
3. **사용자 안전**: 명확한 한계 설정

### 데이터 품질

1. **공식 출처 사용**: 국가암정보센터, 질병관리청
2. **검증 프로세스**: 자동 + 수동 검증
3. **추적 가능성**: Frontmatter로 출처, 수집일 관리
