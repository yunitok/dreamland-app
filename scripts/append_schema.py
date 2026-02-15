import os

base_schema = r"c:\Webs\dreamland-projects\dreamland-app\prisma\schema.prisma"
new_schema = r"C:\Users\miguel\.gemini\antigravity\brain\6c33d76b-a6a3-44d9-9bde-b4852842afe3\sherlock_schema.prisma"

try:
    with open(base_schema, 'r', encoding='utf-8') as f:
        base_content = f.read()

    with open(new_schema, 'r', encoding='utf-8') as f:
        new_content_lines = f.readlines()

    # Skip first 13 lines of new schema
    append_content = "".join(new_content_lines[13:])

    with open(base_schema, 'w', encoding='utf-8') as f:
        f.write(base_content + "\n" + append_content)
    
    print("SUCCESS: Schema appended successfully")
except Exception as e:
    print(f"ERROR: {e}")
