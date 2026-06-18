import requests
import json
import urllib.parse

url = "https://docs.google.com/forms/d/e/1FAIpQLSfBv64251XjB1yUf7o0Hn1fK_Yy-Z55A7T4v94jQ-l-9o1P3g/viewform" # Sample public form

res = requests.get(url)
content = res.text
start_str = "var FB_PUBLIC_LOAD_DATA_ = "
start_idx = content.find(start_str)
content_sub = content[start_idx + len(start_str):]
end_idx = content_sub.find(";</script>")
if end_idx == -1:
    end_idx = content_sub.find("</script>")
json_data = content_sub[:end_idx].strip()
if json_data.endswith(';'):
    json_data = json_data[:-1]

form_data = json.loads(json_data)
fields_data = form_data[1][1]

extracted = []
for field in fields_data:
    if len(field) > 4 and field[4]:
        entry_id = field[4][0][0]
        extracted.append(f"entry.{entry_id}")

print("Extracted fields:", extracted)
