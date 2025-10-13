import streamlit as st
import requests
import json

# 페이지 설정
st.set_page_config(
    page_title="Medical RAG Chat",
    page_icon="🏥",
    layout="wide"
)

# Backend API URL
BACKEND_URL = "http://localhost:3001"

# 세션 상태 초기화
if "messages" not in st.session_state:
    st.session_state.messages = []
if "mode" not in st.session_state:
    st.session_state.mode = "Default"

# 타이틀
st.title("🏥 Medical RAG Chat System")
st.markdown("---")

# 사이드바 - 모드 선택
with st.sidebar:
    st.header("⚙️ Settings")

    mode = st.radio(
        "Select Mode:",
        ["Default", "AI Agent"],
        index=0 if st.session_state.mode == "Default" else 1,
        help="Default: 직접 검색 방식\nAI Agent: Tool을 사용하는 방식"
    )

    st.session_state.mode = mode

    st.markdown("---")

    # 모드 설명
    st.markdown("### 📖 Mode Description")
    if mode == "Default":
        st.info(
            "**Default Mode**\n\n"
            "직접 벡터 검색을 수행하여 관련 문서를 찾고, "
            "LLM에게 컨텍스트와 함께 질문을 전달하는 방식입니다."
        )
    else:
        st.info(
            "**AI Agent Mode**\n\n"
            "LLM이 Tool을 사용하여 필요시 자동으로 문서를 검색하고 "
            "답변하는 방식입니다. 의학과 무관한 질문도 답변할 수 있습니다."
        )

    st.markdown("---")

    # Clear 버튼
    if st.button("🗑️ Clear Chat History"):
        st.session_state.messages = []
        st.rerun()

# 대화 히스토리 표시
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 사용자 입력
if prompt := st.chat_input("질문을 입력하세요 (예: 당뇨병의 증상은 무엇인가요?)"):
    # 사용자 메시지 추가
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    # AI 응답 생성
    with st.chat_message("assistant"):
        sources_placeholder = st.empty()
        message_placeholder = st.empty()
        full_response = ""
        sources = []

        try:
            # API 엔드포인트 선택
            endpoint = "/api/chat/default" if mode == "Default" else "/api/chat/agent"
            url = f"{BACKEND_URL}{endpoint}"

            # 스트리밍 요청
            with requests.post(
                url,
                json={"query": prompt},
                stream=True,
                headers={"Accept": "text/event-stream"}
            ) as response:
                if response.status_code == 200:
                    for line in response.iter_lines():
                        if line:
                            line_str = line.decode('utf-8')

                            # SSE 형식 파싱
                            if line_str.startswith('data: '):
                                data_str = line_str[6:]  # 'data: ' 제거
                                try:
                                    data = json.loads(data_str)

                                    if data.get("type") == "sources":
                                        # 검색된 문서 출처 표시
                                        sources = data.get("sources", [])
                                        if sources:
                                            with sources_placeholder.expander("📚 참고한 문서", expanded=False):
                                                for idx, src in enumerate(sources, 1):
                                                    st.markdown(f"**{idx}. {src['disease_name']}**")
                                                    st.caption(src['content'])
                                                    if src.get('section'):
                                                        st.caption(f"섹션: {src['section']}")
                                                    st.markdown("---")

                                    elif data.get("type") == "chunk":
                                        full_response += data["chunk"]
                                        message_placeholder.markdown(full_response + "▌")

                                    elif data.get("type") == "done":
                                        break

                                    elif "error" in data:
                                        st.error(f"Error: {data['error']}")
                                        break

                                except json.JSONDecodeError:
                                    continue

                    # 최종 응답 표시
                    message_placeholder.markdown(full_response)

                else:
                    error_msg = f"Error: API returned status code {response.status_code}"
                    st.error(error_msg)
                    full_response = error_msg

        except requests.exceptions.ConnectionError:
            error_msg = "⚠️ Backend 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요."
            st.error(error_msg)
            full_response = error_msg
        except Exception as e:
            error_msg = f"⚠️ An error occurred: {str(e)}"
            st.error(error_msg)
            full_response = error_msg

        # 응답 저장 (소스 정보 포함)
        response_with_sources = full_response
        if sources:
            response_with_sources += "\n\n---\n**참고 문서:**\n"
            for idx, src in enumerate(sources, 1):
                response_with_sources += f"{idx}. {src['disease_name']}\n"

        st.session_state.messages.append({"role": "assistant", "content": response_with_sources})

# Footer
st.markdown("---")
st.markdown(
    f"**Current Mode:** `{mode}` | "
    f"**Backend:** `{BACKEND_URL}` | "
    f"**Messages:** `{len(st.session_state.messages)}`"
)
