import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

try:
    response = client.chat.completions.create(
        model="liquid/lfm-2.5-2.6b:free",
        messages=[{"role": "user", "content": "Hello! Reply in 1 short sentence."}]
    )
    print("\n--- Connection Success ---")
    print(response.choices[0].message.content)
except Exception as e:
    print("\n--- Error ---")
    print(e)

