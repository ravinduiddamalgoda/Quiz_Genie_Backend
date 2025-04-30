
import os
import re
import json
import unicodedata
from google.colab import files
from typing import List, Dict, Any

import os
openai.api_key = os.getenv("OPENAI_API_KEY")


# ------------------------------
# 1. IMPROVED LANGUAGE DETECTION
# ------------------------------

def detect_language_by_script(text):
    """
    Detect language by analyzing the Unicode script of characters.

    Args:
        text: Text sample to analyze

    Returns:
        language_code: "si" for Sinhala, "ta" for Tamil, "en" for English, or "unknown"
    """
    # Take a sample of the text
    sample = text[:1000]

    # Count characters by script
    script_counts = {}
    for char in sample:
        if char.isalpha():
            # Get the Unicode name of the character
            try:
                char_name = unicodedata.name(char)
                if "SINHALA" in char_name:
                    script_counts["si"] = script_counts.get("si", 0) + 1
                elif "TAMIL" in char_name:
                    script_counts["ta"] = script_counts.get("ta", 0) + 1
                elif "LATIN" in char_name:
                    script_counts["en"] = script_counts.get("en", 0) + 1
            except:
                pass

    # If no script was detected
    if not script_counts:
        return "unknown"

    # Return the most common script
    return max(script_counts.items(), key=lambda x: x[1])[0]

# Alternative: Using Google Cloud Translation API for language detection
# Uncomment this function and the necessary imports if you prefer to use this method
"""
from google.cloud import translate_v2 as translate

def detect_language_with_google(text):
    # Ensure your Google Cloud credentials are set up
    # os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "path/to/your/credentials.json"

    client = translate.Client()
    sample = text[:1000]  # Use a sample of text

    try:
        result = client.detect_language(sample)
        return result["language"]
    except Exception as e:
        print(f"Error detecting language: {e}")
        return "unknown"
"""

# ------------------------------
# 2. LOAD THE CONSTITUTION DOCUMENTS
# ------------------------------
# Upload your constitution text files (e.g., "constitution_sinhala.txt" and "constitution_tamil.txt")
uploaded = files.upload()  # When prompted, select your files

# Convert each uploaded file into a LangChain Document
from langchain.docstore.document import Document

documents = []
document_languages = {}  # Store detected language for each document

for filename in uploaded.keys():
    with open(filename, "r", encoding="utf-8") as f:
        text = f.read()

        # Try to detect the language of the document using our custom script detector
        detected_lang = detect_language_by_script(text)
        document_languages[filename] = detected_lang
        print(f"Detected language for {filename}: {detected_lang}")

        # Create a Document object with language metadata
        documents.append(Document(
            page_content=text,
            metadata={"source": filename, "language": detected_lang}
        ))

print(f"Loaded {len(documents)} documents.")

# ------------------------------
# 3. SPLIT DOCUMENTS INTO CHUNKS
# ------------------------------
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Split using newlines; set chunk size ~500 characters with an overlap of 50.
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
doc_chunks = []
for doc in documents:
    chunks = text_splitter.split_text(doc.page_content)
    for chunk in chunks:
        # Create a new Document for each chunk, preserving the language metadata
        doc_chunks.append(Document(
            page_content=chunk,
            metadata=doc.metadata
        ))

print(f"Total chunks created: {len(doc_chunks)}")

# ------------------------------
# ------------------------------
# Use OpenAIEmbeddings with the model "text-embedding-ada-002"
from langchain.embeddings import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")

conn_str = "postgresql://postgres:l_uQ5OGfr.?7e]LZ@34.147.2.148:5432/api"  # <-- Update this
# Create (or load) the vector store using PGVector.
from langchain.vectorstores import PGVector
try:
    vectorstore = PGVector(
        embedding_function=embeddings,
        collection_name="constitution",
        connection_string=conn_str
    )
    print("Loaded existing vector store.")
except:
    # If loading fails (e.g., collection doesn't exist), create a new store
    vectorstore = PGVector.from_documents(
        doc_chunks,
        embeddings,
        collection_name="constitution",
        connection_string=conn_str
    )
    print("Created new vector store.")
print("Vector store created in PostgreSQL using PGVector with OpenAIEmbeddings.")

# Create a retriever from the vector store.
retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

# ------------------------------
from langchain.chat_models import ChatOpenAI
llm = ChatOpenAI(temperature=0.7, model_name="gpt-4-turbo")

# ------------------------------
# 6. MCQ QUIZ GENERATOR FUNCTIONS
# ------------------------------
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.schema import HumanMessage

# Language code mappings for common languages
LANGUAGE_INSTRUCTIONS = {
    "si": """
Generate the question and all options in Sinhala language.
Use Sinhala script and terminology appropriate for legal/constitutional context.
Ensure the language is formal and accurate for constitutional concepts.
    """,

    "ta": """
Generate the question and all options in Tamil language.
Use Tamil script and terminology appropriate for legal/constitutional context.
Ensure the language is formal and accurate for constitutional concepts.
    """,

    "en": "Generate the question and all options in English language.",

    "unknown": "Generate the question in the same language as the context provided."
}

def create_mcq_prompt(language_code="unknown"):
    """Create a prompt template for generating MCQ questions in the specified language."""

    language_instruction = LANGUAGE_INSTRUCTIONS.get(language_code, LANGUAGE_INSTRUCTIONS["unknown"])

    prompt_template = f"""
    Based on the following context from the constitution documents, generate an MCQ question of {{difficulty}} difficulty level.

    {language_instruction}

    CONTEXT:
    {{context}}

    Generate a question with 4 answer options (A, B, C, D), and indicate the correct answer.
    The question should test understanding of specific details in the constitution.

    Format your response as a JSON object with the following structure:
    {{{{
        "question": "The question text",
        "options": {{{{
            "A": "First option",
            "B": "Second option",
            "C": "Third option",
            "D": "Fourth option"
        }}}},
        "correct_answer": "The letter of the correct option (A, B, C, or D)",
        "difficulty": "{{difficulty}}"
    }}}}

    For {{difficulty}} difficulty:
    - Easy: Basic factual questions that can be directly found in the text
    - Medium: Questions requiring understanding of concepts or indirect references
    - Hard: Questions requiring deeper analysis, comparing multiple sections, or understanding implications

    RESPONSE (in strict JSON format):
    """
    return PromptTemplate(
        input_variables=["context", "difficulty"],
        template=prompt_template
    )

def detect_document_language(retrieved_docs):
    """
    Detect the predominant language in the retrieved documents.

    Args:
        retrieved_docs: List of document chunks retrieved from the vector store

    Returns:
        language_code: ISO 639-1 language code (e.g., 'en', 'si', 'ta')
    """
    # Count language occurrences in retrieved documents
    language_counts = {}

    for doc in retrieved_docs:
        lang = doc.metadata.get("language", "unknown")
        language_counts[lang] = language_counts.get(lang, 0) + 1

    # Find the most common language
    if language_counts:
        predominant_language = max(language_counts.items(), key=lambda x: x[1])[0]
        return predominant_language
    else:
        return "unknown"

# Function to detect language from user prompt
def detect_prompt_language(prompt):
    """Detect the language of the user's prompt."""
    return detect_language_by_script(prompt)

import json

def generate_mcq_quiz(user_prompt: str, num_questions: int = 10, target_language: str = None) -> List[Dict[Any, Any]]:
    """
    Generate MCQ quiz based on user prompt and retrieved content.

    Args:
        user_prompt: The user's query or topic for the quiz
        num_questions: Number of questions to generate
        target_language: Specific language code to generate questions in (overrides auto-detection)

    Returns:
        List of MCQ question dictionaries
    """
    prompt_language = detect_prompt_language(user_prompt)
    print(f"Detected prompt language: {prompt_language}")

    retrieved_docs = vectorstore.similarity_search(query=user_prompt, k=10)
    if len(retrieved_docs) <= 0:
        raise ValueError("Not enough relevant content found. Please try a different query.")

    language_code = target_language or detect_document_language(retrieved_docs) or prompt_language
    print(f"Generating questions in language: {language_code}")

    combined_context = "\n\n".join([doc.page_content for doc in retrieved_docs])

    easy_count = num_questions // 3
    medium_count = num_questions // 3
    hard_count = num_questions - easy_count - medium_count

    difficulties = (["easy"] * easy_count +
                    ["medium"] * medium_count +
                    ["hard"] * hard_count)

    mcq_prompt = create_mcq_prompt(language_code)
    mcq_chain = LLMChain(llm=llm, prompt=mcq_prompt)

    questions = []
    for difficulty in difficulties:
        try:
            response = mcq_chain.run(context=combined_context, difficulty=difficulty)

            # Parse the JSON string safely
            question_data = json.loads(response)

            # Validate structure
            if all(k in question_data for k in ["question", "options", "correct_answer", "difficulty"]):
                questions.append(question_data)
            else:
                print(f"Invalid question format skipped: {response}")

        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
        except Exception as e:
            print(f"Unexpected error during question generation: {e}")

    return questions

    """
    Generate MCQ quiz based on user prompt and retrieved content.

    Args:
        user_prompt: The user's query or topic for the quiz
        num_questions: Number of questions to generate
        target_language: Specific language code to generate questions in (overrides auto-detection)

    Returns:
        List of MCQ question dictionaries
    """
    # First detect the language of the user prompt
    prompt_language = detect_prompt_language(user_prompt)
    print(f"Detected prompt language: {prompt_language}")

    # Retrieve relevant documents
    retrieved_docs = vectorstore.similarity_search(query=user_prompt, k=10)

    # If we don't have enough documents, we can't generate a good quiz
    if len(retrieved_docs) < 0:
        raise ValueError("Not enough relevant content found. Please try a different query.")

    # Determine language for question generation
    if target_language:
        language_code = target_language
    else:
        # Priority 1: Use the language of retrieved documents
        docs_language = detect_document_language(retrieved_docs)
        # Priority 2: If documents language is unknown, use prompt language
        language_code = docs_language if docs_language != "unknown" else prompt_language

    print(f"Generating questions in language: {language_code}")

    # Create combined context from retrieved documents
    combined_context = "\n\n".join([doc.page_content for doc in retrieved_docs])

    # Distribute questions among three difficulty levels
    easy_count = num_questions // 3
    medium_count = num_questions // 3
    hard_count = num_questions - easy_count - medium_count

    difficulties = (["easy"] * easy_count +
                    ["medium"] * medium_count +
                    ["hard"] * hard_count)

    # Create prompt template and chain
    mcq_prompt = create_mcq_prompt(language_code)
    mcq_chain = LLMChain(llm=llm, prompt=mcq_prompt)

    # Generate questions
    questions = []
    for difficulty in difficulties:
        try:
            # Generate response
            response = mcq_chain.run(context=combined_context, difficulty=difficulty)

            # Parse JSON response
            question_dict = json.loads(response)

            # Add language information to the question dict
            question_dict["language"] = language_code

            # Validate format
            if all(key in question_dict for key in ["question", "options", "correct_answer", "difficulty"]):
                questions.append(question_dict)
            else:
                # If format is invalid, fix by sending back to LLM
                fixed_response = llm([HumanMessage(content=f"""
                Fix this MCQ question to match the required JSON format:
                {response}

                The format should be:
                {{
                    "question": "The question text",
                    "options": {{
                        "A": "First option",
                        "B": "Second option",
                        "C": "Third option",
                        "D": "Fourth option"
                    }},
                    "correct_answer": "The letter of the correct option (A, B, C, or D)",
                    "difficulty": "{difficulty}",
                    "language": "{language_code}"
                }}
                """)])
                try:
                    fixed_question = json.loads(fixed_response.content)
                    questions.append(fixed_question)
                except json.JSONDecodeError:
                    # If still can't parse, skip this question
                    continue

        except (json.JSONDecodeError, KeyError) as e:
            print(f"Error generating question: {e}")
            continue

    # If we couldn't generate enough questions, try again with remaining slots
    remaining = num_questions - len(questions)
    if remaining > 0:
        # Try to generate remaining questions with mixed difficulties
        for i in range(remaining):
            difficulty = ["easy", "medium", "hard"][i % 3]
            try:
                response = mcq_chain.run(context=combined_context, difficulty=difficulty)
                question_dict = json.loads(response)
                question_dict["language"] = language_code
                questions.append(question_dict)
            except:
                continue

    return questions

# ------------------------------
# 7. USER INTERACTION FOR QUIZ GENERATION
# ------------------------------
def get_quiz(user_prompt, num_questions=10, language=None):
    """
    Generate and display a quiz based on user prompt.

    Args:
        user_prompt: The query or topic for the quiz
        num_questions: Number of questions to generate
        language: Optional language code to force a specific language (si, ta, en)
    """
    try:
        print(f"Generating {num_questions} questions about: {user_prompt}")
        if language:
            print(f"Requested language: {language}")

        quiz = generate_mcq_quiz(user_prompt, num_questions, language)

        # Format and display the quiz
        print(f"\n=== QUIZ: {user_prompt} ===\n")
        for i, q in enumerate(quiz, 1):
            lang_display = ""
            if q.get('language') == "si":
                lang_display = "[Sinhala]"
            elif q.get('language') == "ta":
                lang_display = "[Tamil]"
            elif q.get('language') == "en":
                lang_display = "[English]"

            print(f"Question {i} ({q['difficulty'].upper()}) {lang_display}:")
            print(f"{q['question']}\n")
            for option, text in q['options'].items():
                print(f"{option}. {text}")
            print(f"\nCorrect Answer: {q['correct_answer']}")
            print("=" * 50)

        # Return the quiz data as JSON for possible saving or further processing
        return quiz
    except Exception as e:
        print(f"Error generating quiz: {e}")
        return None

# ------------------------------
# 8. DEMONSTRATE THE QUIZ GENERATOR
# ------------------------------
# Sample question prompt
sample_question_prompt = "ශ්‍රි ලංකා ව්‍යවස්ථාව අනුව අමාත්‍ය මණ්ඩලයේ බලතල"

print("Sample Question Prompt:", sample_question_prompt)

# You can specify a language code to force questions in that language
# si = Sinhala, ta = Tamil, en = English
target_language = None  # Change this to force a specific language, e.g., "si" for Sinhala

# Get MCQ quiz
quiz_data = get_quiz(sample_question_prompt, num_questions=10, language=target_language)

# Save quiz to JSON file if needed
if quiz_data:
    quiz_json = json.dumps(quiz_data, ensure_ascii=False, indent=2)
    with open("constitution_quiz.json", "w", encoding="utf-8") as f:
        f.write(quiz_json)
    print("\nQuiz saved to 'constitution_quiz.json'")